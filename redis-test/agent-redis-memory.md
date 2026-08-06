# 基于 Redis 的 Agent 短期记忆

对应代码：`src/agent-with-redis-memory.mjs`
运行：`pnpm agent:redis-memory`

---

## 一、为什么需要外部记忆

LLM 本身是**无状态**的。每次 `invoke` 都是一次独立的 HTTP 请求，模型不会记得上一轮说了什么。
所谓"多轮对话"，本质是**客户端把历史消息重新拼进这次请求里**。

所以要实现记忆，只需解决两件事：

1. **存**：这一轮结束后，把完整消息列表存起来
2. **取**：下一轮开始前，把它读出来拼在新问题前面

为什么用 Redis 而不是内存变量？

| 方案 | 问题 |
|------|------|
| 进程内数组 | 服务重启即丢失；多实例部署时用户可能落到不同机器，记忆对不上 |
| MySQL / PG | 每轮读写都打数据库，短期高频访问性能浪费；且没有原生过期机制 |
| **Redis** | 内存级速度、天然支持 TTL 自动过期、多实例共享、按 `sessionId` 天然分片 |

短期记忆的特点正好匹配 Redis：**高频读写 + 有时效性 + 不需要永久保存**。

---

## 二、整体数据流

```
用户输入
   ↓
① 从 Redis 读历史 messages（loadMessages）
   ↓
② [...history, new HumanMessage(userText)]  ← 拼装本轮输入
   ↓
③ agent.invoke()
      ├─ summarizationMiddleware 检查消息数
      │    超过 8 条 → 把旧消息压成摘要，只保留最近 4 条
      └─ 调 LLM 拿回答
   ↓
④ 把 result.messages 整体写回 Redis（saveMessages，带 TTL）
   ↓
输出回答
```

关键点：**第 ④ 步存的是 agent 返回的 `result.messages`，而不是自己手动 push**。
因为 `result.messages` 已经是"历史 + 本轮提问 + 本轮回答（+ 可能已被压缩后的形态）"的完整结果，直接整体覆盖最省事，也保证了压缩结果能持久化下来。

---

## 三、逐段代码解析

### 3.1 环境变量与默认值

```js
const REDIS_HOST = process.env.REDIS_HOST ?? "localhost";
const REDIS_PORT = Number(process.env.REDIS_PORT ?? 6379);
const REDIS_DB   = Number(process.env.REDIS_DB ?? 0);
const MEMORY_TTL = Number(process.env.MEMORY_TTL_SECONDS ?? 1800);
const KEY_PREFIX = process.env.MEMORY_KEY_PREFIX ?? "agent:short_memory";
const SESSION_ID = process.env.MEMORY_SESSION_ID ?? "demo_user_001";
```

- 用 `??`（空值合并）而不是 `||`：`||` 会把 `0` 当成假值，`REDIS_DB=0` 就会被错误替换掉
- `MEMORY_TTL = 1800` → 30 分钟不说话，记忆自动消失，这就是"短期"的含义
- `SESSION_ID` 是会话隔离的关键。生产环境里它应该是**真实用户 ID 或对话 ID**，而不是写死的常量

### 3.2 摘要提示词

```js
const summaryPrompt = `你是对话摘要助手。请用中文总结以下对话，包含：
1. 讨论的主要话题
2. 用户提到的重要事实（姓名、偏好、日期等，务必保留原文信息）
3. 继续对话所需的关键上下文
...
{messages}
`;
```

`{messages}` 是 langchain 约定的占位符，中间件会把待压缩的消息填进来。

这个提示词写得细是有原因的：压缩是**有损**的，一旦模型总结时丢掉了"我叫张三"，这个信息就永久消失了。
所以要显式强调"保留姓名、偏好、日期等原文信息"、"不要编造"。

### 3.3 RedisMessageStore —— 存储层封装

```js
class RedisMessageStore {
  messagesKey(sessionId) {
    return `${this.keyPrefix}:${sessionId}:messages`;
  }
  ...
}
```

**Key 设计**：`agent:short_memory:demo_user_001:messages`

用 `:` 分层是 Redis 社区约定（RedisInsight 等 GUI 会自动按 `:` 折叠成树形目录）。
好处是：
- 天然按用户隔离，A 用户读不到 B 用户的记忆
- 可以用 `KEYS agent:short_memory:*` 批量排查（生产环境请用 `SCAN`）

#### loadMessages —— 读

```js
async loadMessages(sessionId) {
  const raw = await this.redis.get(this.messagesKey(sessionId));
  if (!raw) return [];
  return mapStoredMessagesToChatMessages(JSON.parse(raw));
}
```

这里的核心是 `mapStoredMessagesToChatMessages`。

**为什么不能直接 `JSON.parse` 就用？**
LangChain 的消息是**类实例**（`HumanMessage` / `AIMessage` / `SystemMessage` / `ToolMessage`），带方法和内部字段。
`JSON.stringify` 之后它们退化成普通对象，`instanceof` 判断失效，agent 无法识别角色。

这两个函数就是官方提供的序列化桥梁：

```
ChatMessage 实例  ──mapChatMessagesToStoredMessages──►  { type: "human", data: {...} }  可存 JSON
{ type: "human", ... }  ──mapStoredMessagesToChatMessages──►  HumanMessage 实例
```

`if (!raw) return []`：首次对话或 TTL 过期后 `get` 返回 `null`，返回空数组即"从零开始"，无需特殊分支。

#### saveMessages —— 写

```js
async saveMessages(sessionId, messages) {
  const payload = JSON.stringify(mapChatMessagesToStoredMessages(messages));
  await this.redis.set(this.messagesKey(sessionId), payload, "EX", this.ttlSeconds);
}
```

`"EX", this.ttlSeconds` 等价于 `SET key value EX 1800`。

**关键细节：每次写入都重置 TTL。**
这就实现了"滑动过期"——用户持续聊天，记忆一直续命；停止对话 30 分钟后自动清理。
如果用 `SETEX` 之后再单独 `EXPIRE`，就是两次网络往返，这里一条命令搞定，也保证了原子性。

#### clear / ttl —— 辅助方法

```js
async clear(sessionId) { await this.redis.del(this.messagesKey(sessionId)); }
async ttl(sessionId)   { return this.redis.ttl(this.messagesKey(sessionId)); }
```

`TTL` 命令的返回值有三种含义，调试时很有用：

| 返回值 | 含义 |
|--------|------|
| 正整数 | 剩余存活秒数 |
| `-1` | key 存在但**没设过期时间**（说明 TTL 没生效，是 bug） |
| `-2` | key **不存在**（已过期或从未写入） |

### 3.4 invokeWithMemory —— 串起读、算、写

```js
async function invokeWithMemory(agent, store, sessionId, userText) {
  const history = await store.loadMessages(sessionId);        // ① 读
  const result = await agent.invoke(
    { messages: [...history, new HumanMessage(userText)] },   // ② 拼 + ③ 算
    { recursionLimit: 30 },
  );
  await store.saveMessages(sessionId, result.messages);       // ④ 写
  return result;
}
```

- `[...history, new HumanMessage(userText)]`：历史在前、新问题在后，顺序不能颠倒，否则模型理解的时间线是错的
- `recursionLimit: 30`：LangGraph 的**死循环保护**。agent 是 `模型 → 工具 → 模型 → ...` 的循环图，如果模型一直反复调工具不给最终答案，30 步后强制抛错。本例 `tools: []` 用不上，但这是个好习惯
- 函数不碰 `console.log` 之外的副作用，把"记忆读写"和"业务逻辑"隔开了

### 3.5 初始化 Redis 连接

```js
const redis = new Redis({ host: REDIS_HOST, port: REDIS_PORT, db: REDIS_DB });

redis.on("connect", () => console.log("✅ Redis 已连接"));
redis.on("error",   (err) => console.error("❌ Redis 错误:", err.message));
```

`ioredis` 是**懒连接 + 自动重连**的：`new Redis()` 不会阻塞，命令会先排队，连上后自动发送。
监听 `error` 事件是必须的——Node 中未监听的 `error` 事件会直接让进程崩溃。

### 3.6 模型配置

```js
const model = new ChatOpenAI({
  model: process.env.MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  configuration: { baseURL: process.env.OPENAI_BASE_URL },
  temperature: 0,
});
```

- 用 `ChatOpenAI` + 自定义 `baseURL` 接入任何 OpenAI 兼容服务（阿里百炼、DeepSeek、Kimi 等），不用换 SDK
- `temperature: 0`：记忆类任务要的是**准确复述**，不是创造力。摘要环节尤其需要低温度避免编造

### 3.7 createAgent 与摘要中间件

```js
const agent = createAgent({
  model,
  tools: [],
  systemPrompt: "你是会话助手。记住用户提到的关键事实，中文简短回答。若消息中有对话摘要，请据此继续对话。",
  middleware: [
    summarizationMiddleware({
      model,
      summaryPrompt,
      trigger: { messages: 8 },
      keep:    { messages: 4 },
    }),
  ],
});
```

**systemPrompt 里"若消息中有对话摘要，请据此继续对话"这句是必要的。**
压缩发生后，历史被替换成一段摘要文本，模型需要被告知这段文本代表"之前发生过的事"，否则可能把摘要当成用户的新提问。

**中间件的压缩逻辑：**

```
压缩前（9 条，超过 trigger 8）：
  [S] [H1] [A1] [H2] [A2] [H3] [A3] [H4] [A4]
                                    └── keep: 4 ──┘
        └────────── 被压缩的部分 ──────────┘
          ↓ 调 LLM 用 summaryPrompt 总结
压缩后：
  [S] [摘要] [H3] [A3] [H4] [A4]
```

- `trigger: { messages: 8 }`：消息数超过 8 触发
- `keep: { messages: 4 }`：保留最近 4 条原文（原文比摘要精确，最近的对话最重要）
- 压缩在 **agent 内部**完成，`invokeWithMemory` 拿到的 `result.messages` 已经是压缩后的形态，写回 Redis 时自动持久化了压缩结果

**注意：摘要中间件复用了同一个 `model`。** 触发压缩时会额外产生一次 LLM 调用，token 消耗比看起来快。可以给摘要单独配一个更便宜的小模型。

**为什么需要压缩？** 不压缩的话消息会无限增长，最终撞上模型的上下文窗口上限直接报错；即使没超限，每轮都发送几万 token 也是纯粹的成本浪费。

### 3.8 REPL 交互循环

```js
const rl = readline.createInterface({ input: stdin, output: stdout });
let prevCount = (await store.loadMessages(SESSION_ID)).length;

try {
  while (true) {
    const userText = (await rl.question("你: ")).trim();
    if (!userText) continue;
    if (["exit", "quit", ":q"].includes(userText.toLowerCase())) break;
    if (userText === ":clear") { await store.clear(SESSION_ID); prevCount = 0; continue; }

    const { messages } = await invokeWithMemory(agent, store, SESSION_ID, userText);
    console.log("\n助手:", messages.at(-1)?.content);
    if (messages.length < prevCount + 2) console.log("  ⚡ 已触发压缩");
    prevCount = messages.length;
  }
} finally {
  rl.close();
}

await redis.quit();
```

几个值得学的写法：

- `node:readline/promises`：新版 Node 的 Promise 版 readline，可以直接 `await rl.question()`，不用回调地狱
- `prevCount` 初始化时先从 Redis 读一次，这样**重启进程后能接着上次的会话继续**
- **压缩检测技巧**：正常一轮对话消息数应该 `+2`（一问一答）。如果 `messages.length < prevCount + 2`，说明中间有消息被摘要吃掉了，即发生了压缩
- `messages.at(-1)?.content`：`at(-1)` 取最后一条（AI 回答），`?.` 防止空数组时报错
- `try / finally`：无论正常退出还是抛异常，都保证 `rl.close()` 执行，否则终端会卡住不还回光标
- `redis.quit()` 优雅关闭连接（等待队列中命令执行完），比 `disconnect()` 强制断开更安全

---

## 四、运行与验证

### 前置：启动 Redis

```bash
docker compose up -d redis
```

`docker-compose.yml` 里同时提供了 RedisInsight（官方 Web GUI）：

```bash
docker compose up -d          # 一起起来
# 浏览器打开 http://localhost:5540，连 host=redis port=6379
```

### 运行

```bash
pnpm agent:redis-memory
```

### 验证记忆是否生效

```
你: 我叫张三，喜欢用 TypeScript
你: 我叫什么？          ← 应该答出"张三"
（ctrl+c 退出，重新 pnpm agent:redis-memory）
你: 我喜欢什么语言？     ← 重启后仍应答出 TypeScript，说明记忆真的落在 Redis 里
```

### 用 redis-cli 直接看数据

```bash
docker exec -it agent_redis redis-cli

> KEYS agent:short_memory:*
1) "agent:short_memory:demo_user_001:messages"

> TTL agent:short_memory:demo_user_001:messages
(integer) 1783                       # 剩余 1783 秒

> GET agent:short_memory:demo_user_001:messages
"[{\"type\":\"human\",\"data\":{...}}, ...]"
```

### 验证压缩

连续对话 5 轮以上（消息数超过 8），观察输出里出现 `⚡ 已触发压缩`，且 `当前消息数` 明显回落。

---

## 五、生产环境需要改进的点

| 现状 | 生产做法 |
|------|----------|
| `SESSION_ID` 写死 | 从请求上下文取真实 `userId` / `conversationId` |
| 整个列表存一个 String，每次全量读写 | 消息多时用 Redis List（`RPUSH` + `LRANGE -N -1`）只取最近 N 条，避免全量传输 |
| 摘要复用主模型 | 摘要单独配便宜的小模型，降本 |
| 只有短期记忆 | 叠加长期记忆：把"用户姓名/偏好"等稳定事实抽取到 PostgreSQL 或向量库，跨会话永久保留 |
| 无并发保护 | 同一 session 并发请求会互相覆盖（后写的赢）。需要分布式锁或乐观版本号 |
| 无异常兜底 | LLM 调用失败时本轮消息未写回，符合预期；但要给用户友好提示而不是抛栈 |

---

## 六、核心 API 速查

| API | 作用 |
|-----|------|
| `new Redis({ host, port, db })` | ioredis 连接，懒连接 + 自动重连 |
| `redis.set(k, v, "EX", n)` | 写入并设置 n 秒过期（滑动过期靠每次重写实现） |
| `redis.ttl(k)` | 剩余秒数 / `-1` 无过期 / `-2` 不存在 |
| `mapChatMessagesToStoredMessages(msgs)` | ChatMessage 实例 → 可 JSON 化的普通对象 |
| `mapStoredMessagesToChatMessages(objs)` | 普通对象 → ChatMessage 实例 |
| `createAgent({ model, tools, systemPrompt, middleware })` | 创建 langchain agent |
| `summarizationMiddleware({ trigger, keep, summaryPrompt })` | 消息数超阈值时自动摘要压缩 |
| `agent.invoke({ messages }, { recursionLimit })` | 执行一轮，返回含完整 `messages` 的结果 |
| `readline/promises` 的 `rl.question()` | 可 await 的终端输入 |
