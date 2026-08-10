# Redis + Mem0 分层记忆 Agent

对应代码：`src/03_mem0-redis-mem0-agent.mjs`
运行：`docker compose up -d redis` → `pnpm agent`

---

## 一、要解决的问题：一种记忆不够用

上一课（`redis-test/agent-redis-memory.md`）用 Redis 做短期记忆，解决了"多轮对话"。
但 Redis 方案有两个天花板：

1. **TTL 一到全没了**：30 分钟不说话，"我叫小明、我海鲜过敏"这类事实也一起蒸发
2. **不区分重要性**：历史里既有"我住杭州"（值得永久记住），也有"嗯好的"（说完就该扔），压缩时被一视同仁地摘要掉

人类记忆不是这样的。人类是**工作记忆 + 长期记忆**两套系统：刚才说的话逐字记得（工作记忆），但一周后只记得"这人叫小明、对海鲜过敏"（长期记忆，抽取过的事实）。

这份代码就是把这两套系统拼起来：

| 层 | 存哪 | 存什么形态 | 生命周期 | 谁决定写入 |
|----|------|-----------|---------|-----------|
| **短期 / 工作记忆** | Redis | 消息**原文**（逐字） | TTL 30 min，滑动过期 | 无条件全存 |
| **长期 · 用户层** | Mem0 `user_id` | LLM 抽取后的**事实句** | 永久，跨会话 | LLM 分类器判断 |
| **长期 · 会话层** | Mem0 `user_id + run_id` | LLM 抽取后的**事实句** | 跟着这个 session | LLM 分类器判断 |

一句话记忆分工：

> **Redis 管"刚才说了什么"，Mem0 用户层管"你是谁"，Mem0 会话层管"这个窗口在干什么活"。**

### 为什么长期记忆不能也放 Redis

放得下，但检索方式不对。长期记忆的用法是**按语义捞相关的几条**（"我过敏什么？" → 捞出"对海鲜过敏"），Redis 的 `GET` 只能整块取出全量。
Mem0 背后是"LLM 抽取事实 + 向量库 + 去重/冲突消解"的托管服务，`search(query)` 就是语义检索。这也是它和自己搓一个 PG 表的区别。

### 为什么会话层不能用 Redis 的短期记忆替代

会不会觉得"这次要写 Q1 总结"这种事，Redis 里的历史原文本来就有？
两点区别：

- Redis 会 TTL 过期、会被摘要压缩掉；会话层是**抽取过的结论**，不随压缩丢失
- 会话层是**语义可检索**的。20 轮以后问"我们大纲是啥"，Redis 里那条原文可能已经被摘要吃掉了，会话层还能精准捞出来

---

## 二、整体数据流

```
用户输入 userText
   │
   ├─① Redis: loadMessages(sessionId)        ← 短期，原文历史
   │
   ├─② Mem0: search(userText) 并发两路        ← 长期，语义检索
   │        ├─ filters: {user_id}                  → 用户层
   │        └─ filters: AND[{user_id},{run_id}]    → 会话层
   │
   ├─③ 拼装本轮输入
   │     [ SystemMessage(记忆块), ...history, HumanMessage(userText) ]
   │        └─ 临时注入，不落 Redis
   │
   ├─④ agent.invoke()
   │     ├─ summarizationMiddleware：消息 > 8 条则把老消息压成摘要，留最近 4 条
   │     └─ 调 LLM 出回答
   │
   ├─⑤ Redis 写回：过滤掉 SystemMessage 后整体覆盖 + 重置 TTL
   │
   └─⑥ 分类器 LLM 判断这轮有没有"新事实"
         ├─ write_user    → mem0.add(turn, { userId })
         └─ write_session → mem0.add(turn, { userId, runId })
   │
输出回答
```

**注意每轮的 LLM 调用次数**：主回答 1 次 + 分类器 1 次 +（触发压缩时）摘要 1 次 + Mem0 服务端抽取（算它家的账）。
这是分层记忆的真实成本，不是免费的。

---

## 三、逐段代码解析

### 3.1 三个 scope 常量

```js
const USER_ID = process.env.MEM0_USER_ID ?? "demo_user_001";
const SESSION_ID = "session_002";
const MEM0_TOP_K = Number(process.env.MEM0_TOP_K ?? 5);
```

`SESSION_ID` 一个变量兼了两个身份，这是理解全篇的关键：

- 传给 Redis → 拼成 key `agent:short_memory:session_002:messages`
- 传给 Mem0 → 作为 `run_id`，圈定会话层记忆

所以"同一个会话"在两套存储里是对齐的。**写死成常量是为了方便重启后接着上次的会话验证**（改成随机 UUID 就没法验"重启后 user 层还认得我"了）。生产环境这里应该是真实的 `conversationId`。

### 3.2 memorySchema —— 让分类结果结构化

```js
const memorySchema = z.object({
  write_user: z.boolean().describe("写入用户层：换一个新会话仍应保留的长期事实……"),
  write_session: z.boolean().describe("写入会话层：仅当前会话/thread 有效的任务、大纲……"),
  reason: z.string().describe("分类理由，一句话"),
});
```

三个字段各有讲究：

- **两个独立 boolean 而不是一个枚举**：一句话可能同时含长期事实和当前任务（"我长期做后端，这次排查 payment-api 超时"），必须允许两层都写
- **`.describe()` 不是注释**：它会被转成 JSON Schema 里的 `description` 一起发给模型，是**提示词的一部分**。写得越准，分类越稳
- **`reason` 字段的真正作用是让模型"先想再答"**。模型按字段顺序生成，先出 boolean 再出 reason 其实是"先答后编理由"；对我们而言主要价值是**可观测**——终端能看到它为什么这么分，调 prompt 时有依据

### 3.3 CLASSIFIER_PROMPT —— 这份代码里最该反复调的东西

```js
const CLASSIFIER_PROMPT = `你是记忆分层分类器。……
## user 层（跨会话长期）…… ## session 层（仅当前会话）…… ## 均不写入……
## 决策原则
1. 「这次我们先写 Q1 总结」→ 优先 session，不要标成 user
2. user 与 session 可同时为 true，但勿把纯会话任务只标 user
3. 一次性请求（如「帮我做旅行攻略」）且未产生需跨轮记住的约定 → 均为 false`;
```

为什么要专门开一次 LLM 调用做这件事？因为**"什么值得长期记住"是语义判断，规则写不出来**。
关键词匹配（含"我叫" → 写 user）会漏掉"我这人吃海鲜会起疹子"，也会误伤"我叫它 A 方案"。

prompt 的三段结构对应分类器的三类错误，是从实际踩坑倒推出来的：

| 错误 | 后果 | prompt 对策 |
|------|------|-----------|
| 该记的没记 | 换会话就忘了你过敏 | user 层正面清单写具体（姓名/职业/过敏/技术栈） |
| 会话任务误记成 user | 下个月聊天还在提"Q1 总结" —— **记忆污染，最难清** | 决策原则 1、2 反复强调 |
| 什么都记 | "你好""谢谢"塞满向量库，检索质量被稀释 | 「均不写入」明确列出寒暄、助手生成内容 |

第三类里有一条容易忽略的：**"助手生成的通用内容，用户未明确采纳"不写入**。
否则模型输出的旅行攻略、示例代码全被当成"用户事实"存进去，长期记忆会被自己的输出灌满。

### 3.4 messagesForRedis —— 为什么必须过滤 SystemMessage

```js
function messagesForRedis(messages) {
  return messages.filter(
    (m) => !SystemMessage.isInstance(m) && !SystemMessageChunk.isInstance(m),
  );
}
```

这是整份代码里最容易写错、也最值得理解的一处。

Mem0 记忆是**每轮重新检索、重新注入**的。如果把它连同历史一起写回 Redis：

```
第 1 轮存: [S:记忆v1] [H1] [A1]
第 2 轮取出后又注入: [S:记忆v2] [S:记忆v1] [H1] [A1] [H2]
第 3 轮: [S:记忆v3] [S:记忆v2] [S:记忆v1] ...
```

三个问题一起爆：**过期快照堆积**（v1 可能已被 Mem0 删除或更新）、**token 线性膨胀**、**模型看到矛盾记忆不知信哪个**。

所以规则是：**Redis 只存"真实发生过的对话"，记忆块是每轮临时挂上去的装饰，用完即弃。**

几个配套细节：

- 为什么还要判 `SystemMessageChunk`：流式场景下消息可能是 chunk 类型，`SystemMessage.isInstance()` 认不出它，漏判就白过滤了
- 用 `.isInstance()` 而不是 `instanceof`：LangChain 官方推荐，跨包/多版本共存时 `instanceof` 会因为不是同一个类引用而失效
- **`createAgent` 的 `systemPrompt` 不受影响**：它不进 `state.messages`，是每次请求时才拼在最前面的，所以过滤器只会命中 Mem0 注入的那条（终端打印 `过滤 1 条 SystemMessage`）
- **摘要不会被误删**：`summarizationMiddleware` 生成的摘要是 `HumanMessage`（带 `【摘要】` 前缀），不是 SystemMessage，所以压缩结果能正常持久化

### 3.5 RedisMessageStore —— 和上一课完全一致

```js
messagesKey(sessionId) { return `${this.keyPrefix}:${sessionId}:messages`; }

async loadMessages(sessionId) {
  const raw = await this.redis.get(this.messagesKey(sessionId));
  if (!raw) return [];
  return mapStoredMessagesToChatMessages(JSON.parse(raw));
}

async saveMessages(sessionId, messages) {
  const payload = JSON.stringify(mapChatMessagesToStoredMessages(messages));
  await this.redis.set(this.messagesKey(sessionId), payload, "EX", this.ttlSeconds);
}
```

三个复习点：

- `mapChatMessagesToStoredMessages` / `mapStoredMessagesToChatMessages` 是官方的序列化桥梁。直接 `JSON.parse` 拿到的是普通对象，丢了类身份，agent 认不出角色
- `set(..., "EX", ttl)` 一条命令写入 + 设过期，且**每轮重写都会重置 TTL** → 滑动过期
- `ttl()` 返回值：正数=剩余秒数，`-1`=没设过期（说明有 bug），`-2`=key 不存在

### 3.6 Mem0MemoryStore.search —— 两路并发检索

```js
const [userRes, sessionRes] = await Promise.all([
  this.client.search(query, { filters: { user_id: this.userId }, topK: this.topK }),
  this.client.search(query, {
    filters: { AND: [{ user_id: this.userId }, { run_id: this.sessionId }] },
    topK: this.topK,
  }),
]);
```

- **`Promise.all` 并发**：两次都是网络请求，串行等于白等一倍延迟
- **filters 是 Mem0 v2 检索语法**，支持 `AND` / `OR` 组合。会话层必须 `AND` 两个条件——只用 `run_id` 会跨用户串味
- **`topK` 限流**：长期记忆会越攒越多，不封顶就等于把整个向量库塞进 prompt
- **`?? []`**：`search` 可能返回 `{ }` 不带 `results`，兜一下避免下游 `.length` 炸

⚠️ **一个需要知道的重叠**：会话层记忆同时带着 `user_id`，所以第一路"用户层"查询**也可能捞到会话层的那几条**，导致注入的两个块内容重复。
本例靠分类器尽量不把会话任务写进 user 层来缓解。真要彻底切开，得让 Mem0 支持"user_id 存在且 run_id 不存在"的过滤，或者自己给记忆打 `metadata: { layer: "user" }` 再按 metadata 过滤。

### 3.7 buildSystemMessage —— 把记忆变成模型能读的东西

```js
buildSystemMessage({ user, session }) {
  const blocks = [];
  if (user.length) blocks.push(`【用户长期记忆】\n${user.map((m) => `- ${m.memory}`).join("\n")}`);
  if (session.length) blocks.push(`【当前会话记忆】\n${session.map((m) => `- ${m.memory}`).join("\n")}`);
  if (!blocks.length) return null;
  return new SystemMessage(`${blocks.join("\n\n")}\n\n请结合以上记忆回答，勿编造。`);
}
```

- **两个块加中文标题分开**，而不是混成一坨：模型能区分"这是我这个人的长期属性"和"这是当前任务上下文"，回答时不容易把上个季度的任务当成现在的
- **用 SystemMessage 而不是塞进 HumanMessage**：记忆是"背景设定"，不是用户这轮说的话。混进 HumanMessage 模型可能当成提问来回答
- **`return null` 而不是返回空 SystemMessage**：没记忆时不要往 prompt 里放"【用户长期记忆】（空）"，那是纯噪音，还可能诱导模型说"我不了解你"
- **`勿编造`**：检索式记忆天然是不完整的，必须显式压制模型拿几条记忆去推演更多"事实"

### 3.8 classifyAndPersist —— 写入路径

```js
const turn = [
  { role: "user", content: userText },
  { role: "assistant", content: assistantText },
];

const { write_user, write_session, reason } = await this.classifier.invoke([
  new SystemMessage(CLASSIFIER_PROMPT),
  new HumanMessage(`用户：${userText}\n助手：${assistantText}`),
]);

if (write_user)    await this.client.add(turn, { userId: this.userId });
if (write_session) await this.client.add(turn, { userId: this.userId, runId: this.sessionId });
```

**为什么传 `turn`（一问一答）而不只传用户那句？**
Mem0 服务端要自己做一次事实抽取，助手的回答提供了消歧上下文。比如用户说"就按这个来"，只看这一句什么都抽不出，配上助手上一句"建议用方案 B"才知道记什么。

**`add` 是异步的**：接口立刻返回，服务端排队做抽取/去重/冲突消解。所以刚 `add` 完立刻 `search` 大概率查不到，这是正常行为，别当成 bug（`02_mem0-scoped-memory-test.mjs` 把 add 和 search 拆成两个命令就是这个原因）。

**分类只调一次、两层共用结果**：省一次 LLM 调用；代价是两层的判断标准被绑在同一个 prompt 里。

**`userId` 差一个参数就是不同层**：`{ userId }` 写用户层，`{ userId, runId }` 写会话层。Mem0 的 scope 完全由参数组合决定，没有别的开关。

### 3.9 invokeWithMemory —— 六步串起来

```js
const history = await redisStore.loadMessages(sessionId);          // ① 短期
const mem = await mem0Store.search(userText);                      // ② 长期
const memoryMsg = mem0Store.buildSystemMessage(mem);
const invokeMessages = [
  ...(memoryMsg ? [memoryMsg] : []),                               // ③ 记忆在最前
  ...history,
  new HumanMessage(userText),
];
const result = await agent.invoke({ messages: invokeMessages }, { recursionLimit: 30 });  // ④
await redisStore.saveMessages(sessionId, messagesForRedis(result.messages));              // ⑤
await mem0Store.classifyAndPersist(userText, assistantText);                              // ⑥
```

**顺序为什么是 `[记忆, ...历史, 新问题]`**：

- 记忆放最前 → 相当于背景设定，且符合"system 在最前"的模型习惯
- 历史在新问题之前 → 时间线不能颠倒
- 另外这个位置有个隐藏影响：`summarizationMiddleware` 会把 `messages[0]`（如果是 SystemMessage）当成 systemPrompt，压缩时**连同记忆块一起塞进待摘要内容**。这就是 `summaryPrompt` 里要写「用户级长期偏好由外部记忆维护，摘要勿重复堆砌」的原因——不然摘要会把长期记忆抄一遍，下轮再注入一次，重复放大

**⑥ 放在 ⑤ 之后**：先保住这轮对话（Redis 写入快且不会失败），再做慢且可能失败的分类 + Mem0 写入。万一分类挂了，短期记忆已经落地，下一轮对话不受影响。

**`recursionLimit: 30`**：LangGraph 的死循环保护。本例 `tools: []` 用不到，但是好习惯。

### 3.10 分类器模型配置

```js
const llmOpts = {
  apiKey: process.env.OPENAI_API_KEY,
  configuration: { baseURL: process.env.OPENAI_BASE_URL },
  temperature: 0,
};

const model = new ChatOpenAI({ model: process.env.MODEL_NAME, ...llmOpts });

const classifier = new ChatOpenAI({ model: process.env.MODEL_NAME, ...llmOpts })
  .withStructuredOutput(memorySchema);
```

- `llmOpts` 抽出来复用，改 baseURL 只改一处
- `temperature: 0`：分类要的是**稳定可复现**，同一句话每次都该分到同一层
- `withStructuredOutput(schema)` 返回的是新 Runnable，`invoke` 直接拿到通过 zod 校验的 JS 对象，不用自己 `JSON.parse` + 容错

> ⚠️ **踩坑：qwen 报 `'messages' must contain the word 'json'`**
> `@langchain/openai` v1 的 `withStructuredOutput` 对**模型名不以 `gpt-3`/`gpt-4-` 开头**的一律默认走 `jsonSchema`（即 `response_format`）。
> 百炼兼容模式的 qwen 不支持，就会抛 `InvalidParameter: 'messages' must contain the word 'json' ... to use 'response_format' of type 'json_object'`。
> 两种解法：
> 1. 显式改走 tool calling：`withStructuredOutput(memorySchema, { method: "functionCalling" })` ← 推荐，qwen 的 tool calling 很稳
> 2. 在 prompt 里出现 "json" 字样（治标，且 `json_object` 模式不保证匹配 schema）

### 3.11 Agent 与摘要中间件

```js
const agent = createAgent({
  model,
  tools: [],
  systemPrompt: "你是会话助手。结合系统消息中的长期/会话记忆回答，中文简短。有对话摘要则据此继续。",
  middleware: [
    summarizationMiddleware({ model, summaryPrompt, trigger: { messages: 8 }, keep: { messages: 4 } }),
  ],
});
```

`systemPrompt` 两句话各修一个 bug：

- 「结合系统消息中的长期/会话记忆回答」→ 不说的话，模型可能把注入的记忆块当无关背景忽略掉
- 「有对话摘要则据此继续」→ 压缩后历史变成一段摘要文本，得告诉模型这是"之前发生过的事"，否则可能被当成用户的新提问

压缩过程：

```
压缩前（9 条 > trigger 8）：
  [S:记忆] [H1] [A1] [H2] [A2] [H3] [A3] [H4] [A4]
                                  └──── keep 4 ────┘
  └─────────── 被摘要的部分（含记忆块）──────────┘
        ↓ 用 summaryPrompt 调一次 LLM
压缩后：
  [H:【摘要】…] [H3] [A3] [H4] [A4]
```

注意压缩后 **Mem0 的记忆块消失了**——没关系，下一轮会重新检索注入。

`summaryPrompt` 相比上一课明显变短了：

```js
const summaryPrompt = `你是对话摘要助手。用中文简洁总结：话题、会话内进度/报错/待办。
用户级长期偏好由外部记忆维护，摘要勿重复堆砌。不要编造。
待摘要的对话：
{messages}
摘要：`;
```

上一课的摘要要求"务必保留姓名、偏好、日期原文"，因为那时**摘要是唯一的记忆兜底，丢了就永久丢了**。
现在有 Mem0 了，长期事实有专门的家，摘要只需负责"这个会话的进度线"。**职责分开后，两边的 prompt 都能写得更专一。** 这是分层带来的真实收益。

`{messages}` 是中间件约定的占位符。

### 3.12 REPL 与两个清理命令

```js
if (userText === ":clear")      { await redisStore.clear(SESSION_ID); prevCount = 0; }
if (userText === ":clear-mem0") { await mem0Store.clear(); }
```

**两个清理命令分开，是为了单独验证每一层。** 清 Redis 不清 Mem0 → 模拟"新会话"；清 Mem0 不清 Redis → 验证长期记忆真的没了。

```js
async clear() {
  await this.client.deleteAll({ userId: this.userId });
  await this.client.deleteAll({ userId: this.userId, runId: this.sessionId });
}
```

两次 `deleteAll` 对应两层。参数组合和 `add` 完全对称。

压缩检测：

```js
if (redisMessages.length < prevCount + 2) console.log("  ⚡ 已触发压缩");
```

正常一轮 `+2`（一问一答）。少于这个数说明有消息被摘要吃掉了。
注意这里比的是 **`redisMessages`（已过滤 SystemMessage）而不是 `result.messages`**——不然记忆块的有无会让计数忽上忽下，误报压缩。

`prevCount` 初始化时先从 Redis 读一次，所以重启进程能接着上次会话继续计数。

---

## 四、运行与验证

```bash
docker compose up -d redis
pnpm agent
```

需要 `.env` 里有 `MEM0_API_KEY`、`OPENAI_API_KEY`、`OPENAI_BASE_URL`、`MODEL_NAME`。

推荐验证顺序（文件末尾的注释块有完整台词）：

| 步骤 | 输入 | 该看到什么 |
|------|------|-----------|
| 0 | `:clear-mem0` → `:clear` | 干净起点 |
| 1 | `你好` | `Mem0 未写入`（寒暄不该记） |
| 2 | `我叫小明，住在杭州，喜欢骑行和摄影` | `Mem0 写入: user` |
| 3 | `这次我们先写 Q1 季度总结，大纲分三块……` | `Mem0 写入: session`（**不该出现 user**） |
| 4 | `我长期做后端，这次会话排查 payment-api 超时` | 可能 `user, session` 两层都写 |
| 5 | `阈值先假设 3 秒` → `上一句我说的阈值是多少？` | 答得出 → 这是 **Redis** 的功劳，Mem0 还没抽完 |
| 6 | Ctrl+C 重启（**别清 mem0**）→ `我是谁？有什么过敏？` | `Redis 加载 0 条` 但答得出 → **user 层生效** |
| 7 | `:clear-mem0` → `我们这次要写什么？` | 答不出 → 会话层确实被清了 |

第 5、6 步是这份代码的核心对照实验：**第 5 步证明 Redis 在干活（Mem0 来不及），第 6 步证明 Mem0 在干活（Redis 是空的）。**

连聊 5 轮以上（消息 > 8）能看到 `⚡ 已触发压缩`。

直接看两边的原始数据：

```bash
# Redis
docker exec -it <redis容器名> redis-cli
> KEYS agent:short_memory:*
> TTL agent:short_memory:session_002:messages
> GET agent:short_memory:session_002:messages

# Mem0：在 app.mem0.ai 控制台按 user_id / run_id 筛
```

---

## 五、坑与生产化改进

| 现状 | 问题 / 生产做法 |
|------|----------------|
| `SESSION_ID` 写死 `"session_002"` | 生产从请求上下文取真实 `conversationId` |
| `withStructuredOutput` 无 `method` | qwen 等非 gpt 模型会报 `must contain the word 'json'`，显式加 `{ method: "functionCalling" }` |
| 分类器复用主模型 | 分类是简单判断，换更便宜的小模型；或先用规则/长度过滤把明显不用记的（`你好`/`谢谢`）拦掉，省一次调用 |
| 分类 + 写 Mem0 阻塞在响应路径上 | 用户要等分类和两次 `add` 才看到回答。生产应 fire-and-forget 或丢队列异步做 |
| 用户层 search 会捞到会话层记忆 | 给记忆加 `metadata: { layer }` 再按 metadata 过滤 |
| `mem0.add` 失败无重试 | 长期记忆静默丢失且没人发现。至少要打日志 + 重试 |
| 无并发保护 | 同一 session 并发请求会互相覆盖 Redis（后写赢），需分布式锁或版本号 |
| 会话层永不清理 | `run_id` 的记忆没人删就一直留着。应在会话结束时清理，或定期扫 |
| 每轮 2~3 次 LLM 调用 | token 成本是普通对话的 2~3 倍，上线前先算账 |

---

## 六、API 速查

| API | 作用 |
|-----|------|
| `new MemoryClient({ apiKey })` | Mem0 云端客户端 |
| `client.add(messages, { userId })` | 写**用户层**（跨会话），异步抽取 |
| `client.add(messages, { userId, runId })` | 写**会话层** |
| `client.add(messages, { agentId })` | 写 **Agent 层**（角色设定，本例未用） |
| `client.search(q, { filters, topK })` | 语义检索，`filters` 支持 `AND` / `OR` |
| `client.getAll({ filters, pageSize })` | 按 filters 全量列出（不做语义排序） |
| `client.deleteAll({ userId, runId? })` | 按 scope 批量删 |
| `SystemMessage.isInstance(m)` | 类型判断，跨包安全（别用 `instanceof`） |
| `mapChatMessagesToStoredMessages` / `...ToChatMessages` | 消息实例 ↔ 可 JSON 化对象 |
| `llm.withStructuredOutput(zodSchema, { method })` | 结构化输出，`method`: `functionCalling` / `jsonSchema` / `jsonMode` |
| `redis.set(k, v, "EX", n)` | 写入并设 n 秒过期（滑动过期靠每轮重写） |
| `summarizationMiddleware({ trigger, keep, summaryPrompt })` | 超阈值自动摘要，摘要以 `HumanMessage` 形式回填 |

---

## 七、一句话总结

> 短期记忆存**原文**，靠 TTL 自动遗忘；长期记忆存**抽取过的事实**，靠 LLM 分类器决定要不要记、记到哪一层。
> 每轮临时把检索到的记忆注入 prompt，但**绝不写回历史**——这是分层记忆不失控的关键。
