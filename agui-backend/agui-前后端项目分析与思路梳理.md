# agui 前后端项目分析与思路梳理

> 一个「AG-UI 风格」的全栈 AI 聊天应用：**NestJS + LangChain Agent（后端）** ⇆ **AI SDK Data Stream Protocol（协议）** ⇆ **React + useChat + 生成式工具 UI（前端）**。
>
> - 后端：`agui-backend`（NestJS 11 + langchain v1 + `ai` v6）
> - 前端：`agui-frontend`（React 19 + Vite + `@ai-sdk/react` v3 + Streamdown）

---

## 一、这个项目解决什么问题

普通的 SSE 聊天流只有「一段纯文本」，前端只能渲染打字机文字。但真实 Agent 的一次回答包含多种事件：

- 文字增量（token）
- 工具调用开始（工具名）
- 工具参数流式生成中（JSON 逐步补全）
- 工具执行结果返回
- 工具执行出错

**核心目标**：让前端能实时感知 Agent 的完整执行过程，并为每种工具渲染专属 UI（搜索结果卡片、邮件预览面板），而不是一坨 JSON 文本。这就是 AG-UI（Agent-User Interaction）的思想 —— **协议层携带结构化事件，UI 层做生成式渲染**。

实现的关键是三层解耦：

| 层 | 技术 | 职责 |
|---|---|---|
| Agent 执行层 | LangChain `createAgent` | 模型推理 + 工具循环（ReAct） |
| 协议层 | AI SDK **UI Message Stream**（Data Stream Protocol，基于 SSE） | 把 Agent 的执行事件标准化为流式协议 |
| UI 层 | `useChat` + `message.parts` | 按 part 类型/状态渲染文本与工具面板 |

两端不直接耦合：LangChain 的流经 `@ai-sdk/langchain` 适配器翻译成 AI SDK 协议，前端只认协议、不关心后端用什么框架。

---

## 二、整体架构与数据流

```
┌───────────────────────────┐          POST /ai/chat  {messages: UIMessage[]}
│  agui-frontend (React)     │ ───────────────────────────────────────────────┐
│                            │                                                ▼
│  useChat (@ai-sdk/react)   │                                  ┌──────────────────────────┐
│   └ DefaultChatTransport   │                                  │ AiController (@Post chat) │
│      fetch → SSE 流         │                                  │  校验 body.messages        │
│                            │                                  └────────────┬─────────────┘
│  messages: UIMessage[]     │                                               ▼
│   └ parts:                 │                                  ┌──────────────────────────┐
│      text  → Streamdown    │                                  │ AiService                 │
│      tool  → ToolPanels    │                                  │  toBaseMessages(messages) │ ← ai sdk → langchain
│        · web_search 卡片    │                                  │  agent.stream(...)        │
│        · send_mail 预览     │                                  │  toUIMessageStream(...)   │ ← langchain → ai sdk
│                            │                                  └────────────┬─────────────┘
│                            │   SSE: Data Stream Protocol                   │
│                            │ ◀─ text-delta / tool-input-start ─────────────┘
│                            │    tool-input-delta / tool-input-available
│                            │    tool-output-available / error ...
└───────────────────────────┘
                                               ▲
                              ┌────────────────┴────────────────┐
                              │ createAgent（LangChain v1）       │
                              │  model: ChatOpenAI (qwen 等)      │
                              │  tools:                          │
                              │   · web_search → Bocha 搜索 API   │
                              │   · send_mail  → MailerService    │
                              │  Agent 循环: 思考→调工具→再思考→答  │
                              └──────────────────────────────────┘
```

一次「查天气并发邮件」的完整时序：

1. 用户输入 → `sendMessage({text})` → transport 把**全量 messages** POST 到 `/ai/chat`
2. 后端把 UIMessage[] 转成 LangChain BaseMessage[]，交给 agent
3. agent 判断需要联网 → 发起 `web_search` 工具调用
   - 前端此时收到 `tool-input-start` / `tool-input-delta`，渲染「正在调用 web_search：xxx」
4. 工具执行完毕 → `tool-output-available` → 前端把结果文本解析成搜索结果卡片列表
5. agent 继续推理，若需发邮件 → `send_mail` 参数流式生成 → 前端邮件面板实时显示收件人/主题/正文（带光标动画）
6. 最终回答以 `text-delta` 流式输出 → Streamdown 渲染 Markdown（代码高亮、mermaid）

---

## 三、后端 agui-backend 解析

### 1. 文件结构

```
src/
├── main.ts              # 启动（:3000，需开 CORS 供前端跨域调用）
└── ai/
    ├── ai.module.ts     # 提供 CHAT_MODEL / WEB_SEARCH_TOOL / SEND_MAIL_TOOL
    ├── ai.controller.ts # POST /ai/chat —— 唯一接口
    └── ai.service.ts    # createAgent + 两个协议转换
```

### 2. ai.module.ts —— 三个 useFactory Provider

- **`CHAT_MODEL`**：`ChatOpenAI`，走 OpenAI 兼容协议。`.env` 配 `OPENAI_BASE_URL`（如 DashScope）、`MODEL_NAME`、`OPENAI_API_KEY`。
- **`WEB_SEARCH_TOOL`**：`tool()`（`@langchain/core/tools`）+ zod schema `{query, count?}`。
  - 调用 Bocha Web Search API（`https://api.bochaai.com/v1/web-search`，Bearer `BOCHA_API_KEY`）
  - 返回值是**格式化的多段纯文本**（每条结果含 `引用/标题/URL/摘要/网站名称/发布时间`），不是 JSON —— 这个格式是前端解析卡片的「隐式契约」
  - 错误处理策略：**所有失败都 return 错误描述字符串而不是 throw** —— 让 LLM 能读到错误并向用户解释，而不是让整个请求 500
- **`SEND_MAIL_TOOL`**：zod schema `{to: z.email(), subject, text?, html?}`，内部调 `MailerService.sendMail`，`from` 用 env `MAIL_FROM` 兜底，成功后返回「邮件已发送到 xxx」的确认文本。

> 为什么工具用 `tool()` + zod？—— zod schema 会被转成 JSON Schema 提供给 LLM 做 function calling，同时运行时校验参数，一份定义两处生效。

### 3. ai.service.ts —— 最核心的「两次翻译」

```ts
// ① 构造 Agent（构造函数里，一次性）
this.agent = createAgent({
  model,
  tools: [webSearchTool, sendMailTool],
  systemPrompt: '…需要最新信息用 web_search…发邮件用 send_mail…',
});

// ② 每次请求
const lcMessages = await toBaseMessages(messages);      // AI SDK UIMessage → LangChain BaseMessage
const lgStream = await this.agent.stream(
  { messages: lcMessages },
  { streamMode: ['messages', 'values'], recursionLimit: 30 },
);
return toUIMessageStream(lgStream);                      // LangChain 流 → AI SDK UIMessageStream
```

关键点：

- **`createAgent`（langchain v1）**：内置 ReAct 式 Agent 循环 —— 模型输出 tool_calls → 框架自动执行工具 → 把 ToolMessage 塞回上下文 → 再次调用模型，直到产出最终文本。不用自己写循环。
- **`streamMode: ['messages', 'values']`**：`messages` 模式吐 token 级增量（AIMessageChunk，含流式的 tool_call 参数片段），`values` 模式吐每步完整状态。`toUIMessageStream` 需要这些信息来生成 `tool-input-delta` 等细粒度事件。
- **`recursionLimit: 30`**：Agent 循环步数上限，防止模型在「调工具→再调工具」中死循环。
- **`@ai-sdk/langchain` 桥接层是本项目的点睛之笔**：入方向 `toBaseMessages`、出方向 `toUIMessageStream`，让 LangChain Agent 与 Vercel AI SDK 前端生态无缝对接，两边都用各自最成熟的标准。

### 4. ai.controller.ts —— 一行接管 SSE

```ts
@Post('chat')
async postChat(@Body() body, @Res({ passthrough: false }) res) {
  const stream = await this.aiService.stream(body.messages);
  pipeUIMessageStreamToResponse({ response: res, stream });
}
```

- 接口是 **POST**（浏览器直接访问 GET 会 404 `Cannot GET /ai/chat`），body 必须是 `{messages: UIMessage[]}` 且带 `Content-Type: application/json`
- `@Res({ passthrough: false })`：完全接管 Express response，Nest 不再自动序列化返回值 —— 因为要手写流
- `pipeUIMessageStreamToResponse`（`ai` 包）：设置 SSE 响应头并把 UIMessageStream 逐事件写成 **Data Stream Protocol** 格式（`data: {"type":"text-delta",...}` 这样的 SSE 帧）
- 没有用 Nest 的 `@Sse()` 装饰器 —— 因为 `@Sse()` 走 RxJS Observable + 自定义事件格式，而这里要输出 AI SDK 的专有协议格式，直接 pipe 更合适

本地测试：

```bash
curl -N -sS -X POST "http://localhost:3000/ai/chat" -H "Content-Type: application/json" -d "{\"messages\":[{\"id\":\"1\",\"role\":\"user\",\"parts\":[{\"type\":\"text\",\"text\":\"北京今天的天气\"}]}]}"
```

---

## 四、协议层 —— UIMessage 与 Data Stream Protocol

理解这个协议是理解整个项目的钥匙。

### 1. UIMessage 结构（前后端共同语言）

```ts
{
  id: string,
  role: 'user' | 'assistant',
  parts: Array<
    | { type: 'text', text: string }
    | { type: 'tool-xxx' | 'dynamic-tool',   // 工具调用 part
        toolCallId, state, input?, output?, errorText? }
  >
}
```

一条 assistant 消息的 parts 可能是：`[tool part(web_search), text part, tool part(send_mail), text part]` —— **消息不再是一段文本，而是结构化片段序列**，这是生成式 UI 的基础。

### 2. 工具 part 的状态机（前端渲染的依据）

```
input-streaming ──▶ input-available ──▶ output-available
（参数流式生成中）    （参数齐了，执行中）     （拿到结果）
        └────────────────┴──────────▶ output-error（执行失败）
```

对应流上的事件：`tool-input-start → tool-input-delta(×N) → tool-input-available → tool-output-available / tool-output-error`。

`useChat` 在前端**增量维护**这个状态：同一个 toolCallId 的 part 会随事件不断原地更新（state 与 input 逐步补全），所以 React 组件天然能做到「参数打字机效果」。

### 3. 为什么选 AI SDK 协议而不是自定义 SSE

- 前端 `useChat` 免费获得：消息状态管理、流解析、status（ready/submitted/streaming/error）、stop 中断、错误处理
- 工具调用的生命周期事件已被协议标准化，无需自己设计事件格式
- 换后端框架（Nest→Express→Hono）或换 Agent 框架（LangChain→原生）都不影响前端

---

## 五、前端 agui-frontend 解析

### 1. 文件结构

```
src/
├── App.tsx                        # useChat 接线 + 消息列表 + 输入框
└── components/
    ├── StreamdownText.tsx         # 流式 Markdown 渲染（shiki + mermaid）
    ├── ToolPanels.tsx             # ★核心：工具 part 的状态机渲染
    └── *.css
```

技术栈：React 19 + Vite 8 + `@ai-sdk/react`（useChat）+ `ai`（类型与工具函数）+ `streamdown`。无路由无状态库 —— useChat 就是全部状态。

### 2. App.tsx —— useChat 接线

```ts
const transport = useMemo(() => new DefaultChatTransport({ api: 'http://localhost:3000/ai/chat' }), [chatUrl]);
const { messages, sendMessage, status, stop, error, clearError } = useChat<UIMessage>({ transport });
```

- `DefaultChatTransport`：内部 fetch POST + 解析 SSE 流；前端直接写后端绝对地址（vite 无 proxy，靠后端 CORS）
- `status` 驱动一切交互态：`ready` 才能发送、`submitted/streaming` 显示「停止」按钮、textarea 禁用
- 渲染时对每条消息遍历 `parts`，逐个交给 `<MessagePart>`
- **`textStreamActive` 的计算**：只有「最后一条 assistant 消息的**最后一个** text part 且 status 为 busy」才算流式中 —— 用来告诉 Streamdown 哪一段要开打字动画/处理未闭合 Markdown，其余历史文本按静态渲染，避免整页动画

### 3. ToolPanels.tsx —— 生成式工具 UI 的状态机（本项目前端核心）

`MessagePart` 分发逻辑：

```
part.type === 'text'      → <StreamdownText>
isToolUIPart(part) 为 true → <ToolMessagePart>   （ai 包提供 isToolUIPart / getToolName）
```

`ToolMessagePart` 按 **state × 工具名** 二维分发：

| state | web_search | send_mail | 其他工具 |
|---|---|---|---|
| `output-error` | ToolErrorPanel（红色告警） | 同左 | 同左 |
| `input-streaming` / `input-available` | ToolPendingPanel（「正在调用 web_search：{query}」） | **SendMailToolPanel 进度态**：收件人/主题/正文随参数流实时填充 + 光标闪烁动画 | ToolPendingPanel |
| `output-available` | **WebSearchToolPanel**：结果卡片列表 | SendMailToolPanel 完成态（显示发送结果） | DefaultToolOutput（格式化 JSON `<pre>`） |

几个值得学习的细节：

- **类型收窄防线**：SDK 中 `DynamicToolUIPart` 的 input/output 是 `unknown`，代码用 `streamValueToJson` 统一收窄成自定义 `JsonValue`，再用 `isWebSearchToolInput` 等类型守卫解析成强类型 —— 不信任流上的任何数据。
- **宽松解析流式参数**：`parseSendMailToolInputPartial` 对 `input-streaming` 阶段**不完整的 JSON**做部分解析（to 有了 subject 还没有），有什么字段渲染什么字段，光标定位到「下一个待生成字段」，这是打字机体验的来源。
- **文本反解析成卡片**：`parseWebSearchBlocks` 用正则把后端 web_search 返回的多段文本（`引用:/标题:/URL:/摘要:` 格式）解析成 `WebSearchResultItem[]` 渲染卡片；解析失败则降级为 `<pre>` 原文 —— 前后端通过「文本格式约定」而非 JSON 契约耦合（简单但脆弱，改后端格式要同步改正则）。
- **兜底渲染**：未知工具走 `DefaultToolOutput`，字符串尝试 `JSON.parse` 美化，失败原样输出 —— 新增工具时前端不炸，只是没有专属面板。

### 4. StreamdownText.tsx —— 流式 Markdown

```tsx
<Streamdown mode="streaming" isAnimating={isStreaming} parseIncompleteMarkdown
            shikiTheme={['github-light','github-dark']} plugins={{ mermaid, code }} />
```

- `parseIncompleteMarkdown`：流式期间 `**加粗` 还没闭合、代码块还没结束时也能正确渲染，不闪烁不错乱 —— 这是普通 markdown 库做不到的
- `isAnimating` 只对「正在流式的最后一段」为 true（由 App.tsx 的 textStreamActive 决定）
- 插件：shiki 代码高亮（明暗双主题）+ mermaid 图表

---

## 六、关键设计决策（面试可讲的点）

1. **为什么消息用 parts 数组而不是纯文本？**
   Agent 的一次回答 = 文字 + 多次工具调用交错。parts 保留了时间顺序与结构，前端才能把「搜索卡片插在两段文字之间」。这是 AG-UI/生成式 UI 与传统聊天流的本质区别。

2. **LangChain 和 AI SDK 各管什么？**
   LangChain 管「Agent 怎么跑」（工具循环、模型调用）；AI SDK 管「过程怎么传给 UI」（协议 + useChat）。`@ai-sdk/langchain` 的 `toBaseMessages`/`toUIMessageStream` 是唯一胶水，两边都可独立替换。

3. **为什么每次要 POST 全量 messages？**
   服务端无状态（没有会话存储），上下文完全由前端携带。简单、可水平扩展；代价是长对话 payload 变大（生产可加持久化 + 只传增量）。

4. **工具报错为什么 return 字符串而不是 throw？**
   throw 会中断整个 Agent 循环变成 500；return 错误文本则 LLM 能读到失败原因，向用户自然语言解释甚至换个方式重试。

5. **前端如何做到「邮件参数打字机」？**
   协议有 `tool-input-delta` 事件 → useChat 原地更新 part.input → 组件对不完整 input 做宽松部分解析 → 有啥渲染啥 + 光标动画。三层配合缺一不可。

6. **recursionLimit: 30 的意义？**
   Agent 循环的保险丝：防止模型陷入无限工具调用（每次工具结果又触发新调用），最多 30 步强制终止。

7. **已知的脆弱点（可改进项）**：
   - web_search 结果用文本格式 + 前端正则解析，属隐式契约；改成结构化 JSON output 更稳
   - `SendMailToolPanel` 用 `dangerouslySetInnerHTML` 渲染模型生成的 HTML 正文，有 XSS 面（当前仅本地 demo 可接受，生产应 sanitize）
   - 工具 provider 注入类型是 `any`，丢失了类型检查

---

## 七、环境配置与运行

### agui-backend/.env

```
# 大模型（OpenAI 兼容协议）
OPENAI_API_KEY=sk-xxx
OPENAI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
MODEL_NAME=qwen-plus

# Bocha 联网搜索
BOCHA_API_KEY=xxx

# 邮件（nodemailer / @nestjs-modules/mailer）
MAIL_HOST=smtp.qq.com
MAIL_PORT=587
MAIL_USER=xxx@qq.com
MAIL_PASS=授权码
MAIL_FROM=xxx@qq.com
```

> 注意：`nest start --watch` 只监听 .ts 文件，**改 .env 必须手动重启服务**。

### 运行

```bash
# 后端（:3000）
cd agui-backend && pnpm install && pnpm start:dev

# 前端（Vite，默认 :5173）
cd agui-frontend && pnpm install && pnpm dev
```

打开前端页面，输入「北京今天的天气」触发 web_search，或「把结果发邮件到 xxx@qq.com」触发 send_mail。

---

## 八、一句话复述（记忆锚点）

> 前端 `useChat` 把全量 UIMessage POST 给 `/ai/chat`；后端用 `toBaseMessages` 翻译给 LangChain `createAgent`（内置工具循环，挂 web_search 和 send_mail 两个 zod 工具），再用 `toUIMessageStream` + `pipeUIMessageStreamToResponse` 把 Agent 执行流翻译成 AI SDK Data Stream Protocol 的 SSE 推回去；前端按 parts 渲染 —— 文本走 Streamdown 流式 Markdown，工具 part 按「state × 工具名」状态机渲染专属面板（搜索卡片 / 邮件预览打字机）。**LangChain 管 Agent 执行，AI SDK 管协议与 UI，`@ai-sdk/langchain` 是唯一胶水。**
