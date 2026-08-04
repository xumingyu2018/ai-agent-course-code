# LangSmith 全链路观测教学 + 面试题解答

> 面向刚接触 AI 应用开发的同学。读完你会明白：为什么 Agent 必须要「可观测性」、LangSmith 的 Trace 和 Evaluation 分别解决什么问题、四个环境变量是怎么做到零代码侵入上报的，以及怎么把一个 RAG 系统的效果从「我感觉还行」变成「有分数、能对比、能回归」。
>
> 涉及文件（`langsmith-test/`）：
> - `src/01_milvus_insert.mjs` —— 灌数据到 Milvus（准备被观测的对象）
> - `src/02_rag_agent.mjs` —— 被观测的 RAG Agent（LangGraph 两节点）
> - `src/03_cli.mjs` —— 命令行跑一遍，去 LangSmith 看 Trace
> - `src/eval/build_dataset.mjs` —— 建评测数据集
> - `src/eval/evaluators.mjs` —— 三个 LLM-as-Judge 评估器
> - `src/eval/run_eval.mjs` —— 跑评测实验（本文重点）

---

## 一、先搞懂问题：为什么 Agent 特别需要「可观测性」

### 1. 传统后端 vs LLM 应用，debug 难度不是一个量级

写普通接口出 bug，你打个 log、看个堆栈就定位了，因为**逻辑是确定的**：同样的输入必然得到同样的输出。

LLM 应用不是这样：

| 维度 | 传统后端 | LLM 应用 |
|---|---|---|
| 确定性 | 同输入同输出 | 同输入可能不同输出（温度、模型版本、上下文） |
| 失败形态 | 抛异常、报错码 | **不报错但答得不对**（幻觉、答非所问、漏掉资料） |
| 调用链 | 几层函数 | 检索 → 改写 → 多次 LLM → 工具调用 → 再 LLM，嵌套很深 |
| 成本 | 忽略不计 | 每次调用都在烧 token，要盯着花了多少钱 |
| 「对不对」 | 单元测试断言相等 | 没法断言字符串相等，只能判断「语义上好不好」 |

一句话概括痛点：

> **LLM 应用最可怕的失败是「静默失败」—— 程序没报错，但答案是错的。`console.log` 救不了你。**

### 2. 你实际会遇到的三类问题

- **调不明白**：RAG 答错了，到底是「检索没召回到」还是「召回到了但模型没用」？光看最终输出根本分不清
- **算不清账**：一次问答背后调了几次模型、用了多少 token、慢在哪一步？
- **改不敢改**：换了 prompt / 换了模型 / 改了 chunkSize，效果是变好还是变差？靠人肉试三个问题「感觉好像变好了」，这不叫工程

LangSmith 就是对着这三类问题来的：

| 问题 | LangSmith 的解法 | 关键词 |
|---|---|---|
| 调不明白 | **Tracing**：把整条调用链每一层的输入输出全录下来 | Run / Trace |
| 算不清账 | Trace 上自带每步耗时、token 数、报错信息 | Latency / Tokens |
| 改不敢改 | **Evaluation**：固定数据集 + 自动打分 + 实验对比 | Dataset / Experiment |

---

## 二、核心概念（六个词，看懂就够用）

```
Project（项目：一个应用的所有 Trace 归一处）
└── Trace（一次完整请求的全链路）
    └── Run（链路里的一个节点：一次 LLM 调用 / 一次检索 / 一个 chain）
        └── Run（可以无限嵌套，形成树）

Dataset（数据集）
└── Example（一条样例：inputs 问题 + outputs 标准答案）

Experiment（实验：一次「跑完整个数据集 + 打分」的记录）
└── Feedback（每条样例上的分数，由 Evaluator 产出）
```

| 概念 | 一句话 | 在本项目里对应 |
|---|---|---|
| **Run** | 最小观测单元，一次可追踪的调用 | 一次 `retriever.invoke`、一次 LLM 调用 |
| **Trace** | 一个顶层请求牵出的整棵 Run 树 | 一次 `ask("满多少元包邮？")` |
| **Project** | Trace 的分组容器 | `LANGCHAIN_PROJECT=langsmith-test` |
| **Dataset / Example** | 测试用例集合 | `rag-eval-v1`，12 条客服问答 |
| **Evaluator** | 给输出打分的函数 | `evaluators.mjs` 里三个 judge |
| **Experiment** | 数据集 × 系统版本的一次评测结果 | `rag-openevals-qwen-plus-xxxx` |

**类比记忆**：Trace 像 Chrome DevTools 的 Network 面板（看每个请求的瀑布图），Dataset + Experiment 像 CI 里的测试套件 + 测试报告。

---

## 三、五分钟接入：为什么加四个环境变量就够了

### 配置（`.env`）

```bash
# 用于身份验证，实现链路上报
LANGCHAIN_API_KEY=lsv2_pt_xxx
# 指定 LangSmith 中的项目，追踪结果会归类到该项目下
LANGCHAIN_PROJECT=langsmith-test
# 开启 LangSmith 追踪功能（总开关）
LANGCHAIN_TRACING_V2=true
# 自建/私有化部署才需要改，SaaS 默认即可
# LANGCHAIN_ENDPOINT=https://api.smith.langchain.com
```

**注意本项目代码里没有任何一行 `import langsmith` 是为了埋点。** `02_rag_agent.mjs` 从头到尾只是普通的 LangChain + LangGraph 代码，但跑起来就有完整 Trace。

### 原理：Callback 机制 + 环境变量自动装配

LangChain 的每个 Runnable（prompt、llm、retriever、chain、graph node）在执行时都会走一套 **callback 生命周期钩子**：`onChainStart` / `onLLMStart` / `onLLMEnd` / `onChainError` …

LangChain 启动时会检查 `LANGCHAIN_TRACING_V2`，如果为 `true`，就**自动往全局 callback 列表里注册一个 `LangChainTracer`**。这个 tracer 干的事：

1. 每个 Runnable 开始执行 → 创建一个 Run 记录（记下输入、开始时间、父 Run id）
2. 执行结束 → 补上输出、结束时间、token 用量；出错则记下堆栈并标红
3. 通过父子 Run id 串成树 → 批量异步上报到 LangSmith

所以三个特性很重要：

- **零侵入**：业务代码不用改，`LANGCHAIN_TRACING_V2=false` 就完全关闭
- **异步批量上报**：不阻塞主流程（代价是脚本结束太快可能丢最后一批，长跑脚本无所谓）
- **只覆盖 LangChain 生态内的调用**：你自己 `fetch` 调的第三方接口不会自动出现在 Trace 里 —— 想让它出现，得用 `traceable()` 手动包一层

### 手动埋点（非 LangChain 代码想上报时）

```js
import { traceable } from "langsmith/traceable";

const myRerank = traceable(
  async (query, docs) => { /* 自己 fetch 调重排 API */ },
  { name: "dashscope_rerank", run_type: "tool" },
);
```

---

## 四、代码走读：把本项目从头串一遍

整个项目分两条线：**「看」（Tracing）和「量」（Evaluation）**。

```
准备阶段
  01_milvus_insert.mjs   data/*.md → 切块 → embedding → 灌进 Milvus
        │
  ┌─────┴──────────────────────────────┐
  │「看」线                             │「量」线
  ▼                                    ▼
02_rag_agent.mjs  (retrieve→generate)   eval/build_dataset.mjs  建 rag-eval-v1（12 条 Q&A）
  ▲                                    ▼
03_cli.mjs  跑几个问题                  eval/run_eval.mjs  对数据集逐条跑 ask()
  │                                    ▼
  └─→ LangSmith 看 Trace                eval/evaluators.mjs  三个 LLM Judge 打分
                                        ▼
                                       LangSmith Experiment 报告（可跨版本对比）
```

### 4.1 `01_milvus_insert.mjs` —— 准备知识库

不涉及 LangSmith，但决定了后面评测的天花板，三个关键点：

```js
const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 500,      // 每块 500 字
  chunkOverlap: 50,    // 相邻块重叠 50 字，防止答案正好被切断
});
```

- **先 drop 再建**：`hasCollection` → `dropCollection`，保证每次灌数据是干净的全量重建（评测要可复现，不能有脏数据）
- **字段名 `langchain_primaryid` / `langchain_vector` / `langchain_text`**：这是 LangChain `Milvus` vector store 的**默认约定字段名**。手写 SDK 建表时按这个命名，`02` 里才能直接 `Milvus.fromExistingCollection` 挂上去，不用额外配 `textField`
- **索引 `IVF_FLAT` + `L2`**：小数据量够用；embedding 模型是 `text-embedding-v3`，**02 里必须用同一个模型**，否则向量空间对不上，检索全是错的

### 4.2 `02_rag_agent.mjs` —— 被观测的对象

一个最朴素的 RAG，LangGraph 两个节点：

```js
async function retrieve(state) {
  const docs = await retriever.invoke(state.question);
  return { context: docs };
}

async function generate(state) {
  const contextText = state.context.map((d) => d.pageContent).join("\n\n");
  const answer = await chain.invoke({ context: contextText, question: state.question });
  return { answer };
}
```

关键设计 —— **`ask()` 同时返回 `answer` 和 `context`**：

```js
export async function ask(question) {
  const result = await ragApp.invoke({ question });
  return { answer: result.answer, context: result.context ?? [] };
}
```

为什么必须把 `context` 也返回？因为**评测阶段要判断「答案有没有被检索资料支撑」和「检索的资料相不相关」，没有 context 这两个指标根本无从下手**。这是 RAG 系统一个很实用的接口设计原则：

> **对外暴露的不只是答案，还要暴露证据。** 证据既能给前端做引用展示，又能给评测做输入。

另外 prompt 里这句是防幻觉的核心：

```
仅根据下面「上下文」回答；上下文没有的信息请明确说不知道，不要编造。
```

它直接影响后面 `rag_groundedness` 这个指标的分数。

### 4.3 `03_cli.mjs` —— 跑一遍，然后去看 Trace

```bash
node src/03_cli.mjs                      # 跑内置 6 个问题
node src/03_cli.mjs "金卡会员有什么折扣？"   # 跑单个问题
```

跑完打开 LangSmith → Projects → `langsmith-test`，你会看到 6 条 Trace。**展开一条，Run 树大致是这样**：

```
RunnableSequence / LangGraph  (总耗时 2.1s)
├── retrieve                          (0.4s)
│   └── OpenAIEmbeddings.embedQuery   (0.3s)   ← 问题转向量
│   └── Milvus.similaritySearch       (0.1s)   ← 输出：召回的 4 条 chunk 全文
└── generate                          (1.7s)
    └── RunnableSequence
        ├── ChatPromptTemplate        (0ms)    ← 输出：最终拼好的完整 prompt ★
        ├── ChatOpenAI                (1.7s)   ← 输入/输出/tokens/model ★
        └── StringOutputParser        (0ms)
```

**这就是 Trace 最大的价值：RAG 答错时，一眼能分清是哪一环烂了。**

| Trace 上的现象 | 诊断 | 该改哪里 |
|---|---|---|
| `retrieve` 的输出里根本没有正确答案所在的片段 | **召回失败** | chunkSize、k 值、embedding 模型、加关键词/混合检索 |
| `retrieve` 召回对了，但 `ChatOpenAI` 答错/答漏 | **生成失败** | prompt 写法、模型能力、context 拼接顺序 |
| `ChatPromptTemplate` 输出的 prompt 里 `{context}` 是空的 | **变量没传对**（典型的模板 bug） | 检查节点返回的字段名 |
| 某个 Run 耗时占了 80% | **性能瓶颈定位** | 该步加缓存 / 换小模型 / 并行化 |

### 4.4 观测失败：`langgraph-test/src/trigger-error-LangSmith全链路观测.mjs`

那个文件故意在图节点里抛错：

```js
const stepThrow = () => {
  throw new Error("DemoError: 节点内故意抛错（trigger-error.mjs）");
};
```

跑完去 LangSmith 看，你会得到平时最想要的东西：

- 失败的 Run 被**标红**，`Error` 字段里有完整堆栈
- 关键：**`step_ok` 这个成功节点的输出仍然被完整记录**，所以你能看到「崩之前状态是什么样」
- 失败 Trace 可以直接筛选（`Status: Error`），线上排障时按错误率筛 Trace 是常规操作

> 生产环境里 catch 住的异常常常只剩一句 `err.message`，现场早就没了。Trace 保留了**出错那一刻每一层的输入**，这是它比日志强的地方。

### 4.5 `eval/build_dataset.mjs` —— 建数据集

```js
const EXAMPLES = [
  { inputs: { question: "无理由退货要在几天内申请？" },
    outputs: { answer: "自签收之日起 7 天内支持无理由退货。" } },
  // … 共 12 条
];
```

三点值得学：

**① `inputs` / `outputs` 的结构要和被测函数对齐**

`inputs: { question }` 对应 `runRagAgent(inputs)` 里读 `inputs.question`；`outputs` 是**人工标注的标准答案（reference / ground truth）**。字段名不是随便起的，evaluator 里会按名字取。

**② 幂等处理：先读后建**

```js
try {
  dataset = await client.readDataset({ datasetName: DATASET_NAME });
} catch {
  dataset = await client.createDataset(DATASET_NAME, { description: "RAG Agent 回归评估集" });
}
```

重复执行不会因为「数据集已存在」而崩。⚠️ 但注意 `createExamples` **没有做去重**，所以重复跑这个脚本会不断追加重复样例。要么只跑一次，要么先去 LangSmith 上清空样例。

**③ 数据集的本质是「回归测试用例」**

它一旦固定下来，就成了你这个系统的**基准线**。之后不管换模型、改 prompt、改 chunkSize，都拿同一批 12 个问题去跑，分数横向对比 —— 这才是有依据的迭代。

> 数据集怎么攒？初期人工写 10~50 条覆盖核心场景；上线后**从线上 Trace 里挑答错的 case，一键存成 Example**（LangSmith 支持 Trace → Dataset 一键添加）。这是最有价值的数据来源 —— 你的测试集会越来越贴近真实用户。

### 4.6 `eval/evaluators.mjs` —— LLM-as-Judge

核心矛盾：**「答案好不好」没法用 `assert.equal` 判断。** 标准答案是「满 99 元包邮」，模型答「订单金额达到 99 元即可免运费」，字符串完全不同但语义正确。传统断言、甚至 BLEU/ROUGE 这类字面相似度指标，都会误判。

解法：**让另一个 LLM 当裁判（LLM-as-Judge）**。

```js
const judge = new ChatOpenAI({
  model: process.env.MODEL_NAME ?? "qwen-plus",
  temperature: 0,          // ★ 裁判必须是 0，否则同一份答案两次打分不一样
});

const ragGroundednessJudge = createLLMAsJudge({
  prompt: RAG_GROUNDEDNESS_PROMPT,   // openevals 内置的成熟评分 prompt
  feedbackKey: "rag_groundedness",   // 分数在 LangSmith 上的指标名
  judge,
  continuous: true,                  // 输出 0~1 连续分，而非 true/false
});
```

`openevals` 内置了这些 RAG prompt，不用自己写评分标准（自己写很容易写出「模型看不懂/打分飘」的 prompt）：

| 指标 | 内置 prompt | 判断什么 | 输入需要什么 | 分低说明 |
|---|---|---|---|---|
| **忠实度** | `RAG_GROUNDEDNESS_PROMPT` | 答案的每句话是否都能在检索片段里找到依据 → **有没有幻觉** | `context` + `answer` | 模型在编造，加强 prompt 约束 / 换模型 |
| **有用性** | `RAG_HELPFULNESS_PROMPT` | 答案是否切题、是否答非所问 | `inputs`（问题）+ `answer` | 答跑偏了，看 prompt 或问题理解 |
| **检索相关性** | `RAG_RETRIEVAL_RELEVANCE_PROMPT` | 召回的片段跟问题相不相关 | `inputs` + `context` | **检索环节的问题**，调 k / 切块 / 加混合检索 |

**这三个指标为什么正好是这三个？** 因为它们精准地把 RAG 拆成了可归因的两半：

```
retrieval_relevance 低  →  检索烂（召回都不对，后面白搭）
retrieval_relevance 高 + groundedness 低  →  资料对，但模型在编（生成环节的幻觉）
groundedness 高 + helpfulness 低  →  没编造，但没回答用户真正问的（答偏了/太啰嗦/太保守说不知道）
```

**这就是可观测性的精髓：不只告诉你"不行"，还告诉你"哪儿不行"。**

evaluator 函数签名要注意，LangSmith 传进来的是 `{ inputs, outputs, referenceOutputs }`：

```js
export async function ragGroundednessEvaluator({ outputs }) {
  return ragGroundednessJudge({
    context: { documents: outputs.context },   // 检索到的片段
    outputs: { answer: outputs.answer },       // 系统给的答案
  });
}
```

注意这三个 evaluator **都没用到 `referenceOutputs`（标准答案）**—— 它们是「无参考评测」。忠实度只看答案对不对得上检索资料，跟标准答案无关。想加「答案是否与标准答案一致」，得再写一个用 `referenceOutputs` 的 correctness evaluator（`openevals` 的 `CORRECTNESS_PROMPT`）。

> **`continuous: true` 为什么重要**：布尔分只能看到「通过率 8/12」，连续分能看到「平均 0.83」。迭代时布尔分很钝 —— prompt 改好了一点点，通过数可能一条都没变；连续分能反映细微改善。

### 4.7 `eval/run_eval.mjs` —— 把上面全拼起来

```js
async function runRagAgent(inputs) {
  const { answer, context } = await ask(inputs.question);
  return {
    answer,
    context: context.map((d) => d.pageContent),   // ★ Document 对象 → 纯文本数组
  };
}

const result = await evaluate(runRagAgent, {
  data: DATASET_NAME,                                     // 用哪个数据集
  evaluators: ragEvaluators,                              // 用哪些评估器
  client,
  experimentPrefix: `rag-openevals-${process.env.MODEL_NAME ?? "qwen"}`,  // 实验名前缀
  maxConcurrency: 2,                                      // 并发度
});

for await (const _row of result) { /* drain */ }           // ★ 等全部跑完
```

逐个说清楚：

- **`evaluate(target, options)`** 是整个评测的入口。它做的事：拉取数据集所有 Example → 逐条（并发）调 `target(inputs)` → 拿输出交给每个 evaluator 打分 → 把分数作为 Feedback 写回 LangSmith → 归到一个新 Experiment 下
- **`context.map(d => d.pageContent)`**：`ask()` 返回的是 LangChain `Document` 对象数组，但 judge 的 prompt 需要纯文本。这层转换必须做，否则 judge 会看到 `[object Object]`
- **`experimentPrefix` 带上模型名**：LangSmith 会自动加随机后缀（`rag-openevals-qwen-plus-b2524dfb`）。把模型名/关键参数编码进实验名，报告列表里一眼能看出「这次实验改的是什么」—— 这是评测的基本卫生习惯
- **`maxConcurrency: 2`**：并发太高会触发 API 限流。注意每条样例的成本是 **1 次 RAG（embedding + 生成）+ 3 次 judge 调用 = 4~5 次模型调用**，12 条样例就是 50 次左右，所以要控速也要控预算
- **`for await (const _row of result)`** ⚠️ **最容易漏的一句**：`evaluate()` 返回的是**异步可迭代对象，是懒执行的**。不 drain 它，脚本可能在样例跑完前就退出，导致结果不全。这也是为什么最后的日志要放在 drain 之后

跑完的输出：

```
Starting evaluation of experiment: rag-openevals-qwen-plus-b2524dfb
View results at https://smith.langchain.com/o/.../compare?selectedSessions=...
✅ 评测完成
实验名: rag-openevals-qwen-plus-b2524dfb
指标: rag_groundedness | rag_helpfulness | rag_retrieval_relevance
```

打开那个 compare 链接，就是**表格视图**：每行一条样例，列是 `question / answer / reference / 三个指标分数`，顶部是各指标平均分。**勾选两个实验就能并排 diff**，逐条看哪些样例变好了、哪些退化了。

---

## 五、怎么跑起来

### 前置

```bash
# 1. Milvus 已启动（docker compose up -d，端口 19530）
# 2. .env 配好：
#    OPENAI_API_KEY / OPENAI_BASE_URL / MODEL_NAME / EMBEDDING_MODEL
#    LANGCHAIN_API_KEY / LANGCHAIN_PROJECT / LANGCHAIN_TRACING_V2=true
```

### 四步

```bash
pnpm insert         # 1. data/*.md 灌进 Milvus（node src/01_milvus_insert.mjs）
pnpm ask            # 2. 跑几个问题，去 LangSmith 看 Trace（node src/03_cli.mjs）
pnpm eval:dataset   # 3. 建 rag-eval-v1 数据集（只需跑一次！重复跑会追加重复样例）
pnpm eval:run       # 4. 跑评测实验，输出报告链接
```

### ⚠️ 依赖坑（已在本项目修好，勿回退）

`openevals >= 0.1.5` 依赖 `langchain >= 1.2.27`（LangChain v1），而 v1 的 `langchain` 需要 `@langchain/core` v1。本项目其余部分是 `@langchain/core@0.3.x`，混在一起会报：

```
ERR_PACKAGE_PATH_NOT_EXPORTED: './language_models/stream' is not defined by "exports" in @langchain/core
```

解法两处：

```json
// package.json
"openevals": "^0.1.4"   // 最后一个兼容 core 0.3 的版本
```

```yaml
# pnpm-workspace.yaml
overrides:
  langchain: ^0.3.30
```

> 注意：**pnpm 10+ 不再读取 `package.json` 里的 `pnpm.overrides`**，必须写在 `pnpm-workspace.yaml`。这个报错信息（`ERR_PACKAGE_PATH_NOT_EXPORTED` + 某个 subpath）是 **LangChain 生态 v0.3 / v1 混装** 的典型特征，以后见到就往这个方向查。

---

## 六、常见疑问（FAQ）

**Q1：Trace 里的数据会不会泄露？prompt 和用户数据都传到 LangSmith 了？**
会。默认整个输入输出都上报到 LangSmith 云端。敏感场景的选项：① `LANGCHAIN_TRACING_V2=false` 只在开发环境开；② 用 `hideInputs` / `hideOutputs` 做字段脱敏；③ 自建（Self-hosted LangSmith，企业版）。生产接入前这是必须过的合规问题。

**Q2：开了 Tracing 会拖慢线上接口吗？**
基本不会。上报是**异步批量**的，不在主链路上等。但代价是**短命进程可能丢最后一批数据** —— serverless / 一次性脚本场景建议在退出前 `await client.awaitPendingTraceBatches()`。

**Q3：LLM 当裁判，裁判自己会不会判错？**
会，这是 LLM-as-Judge 的固有局限。缓解手段：① `temperature: 0` 保证可复现；② 用**比被测模型更强的模型**当裁判（本项目图省事用了同款 qwen-plus，严谨做法是换更强的）；③ 抽样人工校验裁判的判断，确认裁判本身靠谱；④ 关注**相对变化**而非绝对分值 —— 裁判有系统性偏差，但两个实验用同一个裁判对比时偏差会抵消。

**Q4：为什么评测不直接比字符串相等，或者用 BLEU/ROUGE？**
自然语言表达方式无穷多。「满 99 元包邮」vs「订单满 99 元免运费」字面差很远但语义等价，字面指标会给低分（假阴性）；反过来抄了一堆原文但答错了，字面指标可能给高分（假阳性）。所以开放式生成任务的主流评测方式是 LLM-as-Judge。

**Q5：`retrieval_relevance` 高但 `groundedness` 低，该改什么？**
说明检索没问题、模型在编。优先改 prompt（强化「只准照资料回答，没有就说不知道」）、降温度、换更听话的模型。反过来 `retrieval_relevance` 就低的话，改 prompt 是白费力气 —— 该去调 chunkSize / k 值 / embedding 模型 / 上混合检索。

**Q6：数据集要多大？**
不是越大越好，要**够用且跑得起**。初期 20~50 条覆盖核心意图 + 已知的坑（边界值、易混淆问题）就很有用。数据集变大意味着每次评测的时间和 token 成本线性上升（本项目 12 条 × 4~5 次模型调用）。真正的增长应该来自**线上答错的真实 case**。

**Q7：`experimentPrefix` 有必要吗？**
非常有必要。评测的价值 90% 来自**对比**。实验名里编码进「改了什么」（模型名、k 值、prompt 版本），三个月后回头看报告列表才知道每次实验的差异在哪。

**Q8：Trace 和普通日志能不能互相替代？**
不能。日志是**扁平的、你主动写的、没有结构**；Trace 是**树形的、自动的、带完整输入输出和耗时**。定位「第 3 层嵌套的那次 LLM 调用收到的 prompt 长什么样」，日志几乎做不到。生产上两者共存：日志负责基础设施层，Trace 负责 LLM 链路层。

**Q9：LangSmith 只能配 LangChain 用吗？**
不是。`traceable()` 可以包任何异步函数，纯 OpenAI SDK 甚至纯业务函数都能上报，LangSmith 的评测（`evaluate`）也只要求你的 target 是个 `(inputs) => outputs` 的函数。只是配 LangChain 用能白拿自动埋点。

---

## 七、面试题解答

> 分三档：**基础概念**（会不会用）→ **原理机制**（懂不懂内部）→ **工程实战**（做过没有）。
> 每题给「考察点 + 参考答案」，答案按面试口述的密度写。

### 基础篇

---

**Q1：LangSmith 是什么？解决什么问题？**

*考察点：能不能一句话说清定位，而不是背文档。*

LangSmith 是 LangChain 官方的 **LLM 应用可观测性与评测平台**，两大核心能力：

1. **Tracing（追踪）**：把一次请求的完整调用链录下来 —— 每一层的输入输出、耗时、token 消耗、报错堆栈，形成一棵可展开的 Run 树。解决「LLM 应用没法 debug」的问题。
2. **Evaluation（评测）**：用固定数据集 + 自动评估器给系统输出打分，形成可跨版本对比的实验报告。解决「改了 prompt / 换了模型，效果到底变好还是变差」的问题。

关键在于它针对的是 LLM 应用特有的痛点：**输出不确定、失败是静默的（不报错但答错）、调用链很深、每次调用都花钱**。这些传统 APM 和日志系统都覆盖不了。

---

**Q2：Run、Trace、Project 是什么关系？**

*考察点：数据模型理解，是否真在平台上看过。*

- **Run** 是最小观测单元 —— 一次可追踪的调用。有类型（`llm` / `chain` / `retriever` / `tool` / `prompt`），记录输入、输出、开始结束时间、token、错误。
- **Run 可以嵌套**，通过 parent id 形成树。一个顶层 Run 牵出的整棵树叫 **Trace**，对应「一次完整的用户请求」。
- **Project** 是 Trace 的分组容器，靠 `LANGCHAIN_PROJECT` 指定。实践中一般按「应用 + 环境」分，比如 `myapp-dev` / `myapp-prod`，避免开发时的噪音污染生产数据。

类比：Project ≈ 一个应用的日志空间，Trace ≈ 一个 requestId 的全部日志，Run ≈ 一条带父子关系的结构化日志。

---

**Q3：怎么给一个 LangChain 项目接入 LangSmith？需要改代码吗？**

*考察点：知不知道零侵入这件事，以及它的边界。*

**不需要改业务代码**，配三个环境变量即可：

```bash
LANGCHAIN_TRACING_V2=true      # 总开关
LANGCHAIN_API_KEY=lsv2_pt_xxx  # 身份认证
LANGCHAIN_PROJECT=my-app       # Trace 归到哪个项目
```

原因是 LangChain 内部有统一的 callback 生命周期，检测到 `LANGCHAIN_TRACING_V2=true` 就自动注册一个 `LangChainTracer` 到全局 callback 列表，所有 Runnable 执行时自动产出 Run 并上报。

**边界要说清楚**：自动埋点只覆盖 LangChain 生态内的调用。自己 `fetch` 调的第三方 API（比如自封装的重排模型）不会出现在 Trace 里，需要用 `traceable()` 手动包一层。

---

**Q4：Dataset 和 Example 是什么？和单元测试什么关系？**

*考察点：能不能把 LLM 评测映射到熟悉的工程概念。*

- **Example** = 一条测试用例：`inputs`（给系统的输入）+ `outputs`（人工标注的标准答案 / reference）
- **Dataset** = Example 的集合，就是一套**回归测试套件**

关系上非常像单元测试，但有一个根本区别：**断言方式不同**。单元测试是 `assert.equal(actual, expected)`，LLM 评测没法这么断言（同一个意思一万种说法），所以断言这一步被替换成了 **Evaluator 打分**（LLM-as-Judge 或规则函数），输出的是 0~1 的分数而不是 pass/fail。

因此评测报告看的不是「全绿」，而是**「各指标平均分 + 相对上一个版本的涨跌」**。

---

### 原理篇

---

**Q5：Tracing 的自动埋点是怎么实现的？会影响性能吗？**

*考察点：是不是只会配环境变量。*

**实现机制**：LangChain 每个 Runnable 执行时都会触发 callback 钩子（`onChainStart` / `onLLMStart` / `onLLMEnd` / `onChainError` …）。开启 tracing 后，框架自动注册 `LangChainTracer` 作为全局 callback handler：

- start 钩子 → 创建 Run（记输入、开始时间、父 Run id）
- end 钩子 → 补输出、耗时、token 用量
- error 钩子 → 记错误堆栈并把 Run 标为失败
- 通过父子 id 串成树，**异步批量**上报

**性能影响**：可忽略。上报是异步的，不阻塞主链路。但要知道两个代价：
1. **短命进程可能丢最后一批数据** → 退出前 `await client.awaitPendingTraceBatches()`
2. **有网络和存储开销**，超高 QPS 场景可以用采样（只上报一部分 Trace）

---

**Q6：什么是 LLM-as-Judge？为什么 RAG 评测要用它，不用 BLEU/ROUGE 或字符串比较？**

*考察点：理解开放式生成任务的评测本质。这题答得好很能拉分。*

**LLM-as-Judge** = 用一个 LLM 按预设评分标准（prompt）给另一个系统的输出打分。

**为什么不用字面指标**：自然语言表达是多对一的。标准答案「满 99 元包邮」，系统答「订单金额达到 99 元即可免运费」—— 语义完全正确但字面重叠很低，BLEU/ROUGE 会给低分（**假阴性**）。反过来，一个答案大段抄了原文但结论说错了，字面指标可能给高分（**假阳性**）。字面指标只适合翻译、摘要这类「参考答案表述相对固定」的任务。

**LLM-as-Judge 的工程要点**（这几条是加分项）：
- `temperature: 0` —— 裁判必须可复现，否则同一份答案两次跑分数不同，对比就失去意义
- **裁判模型应该 ≥ 被测模型**，用弱模型评强模型不可靠
- 优先用**成熟的内置评分 prompt**（如 `openevals` 的 `RAG_GROUNDEDNESS_PROMPT`），自己写的评分标准很容易含糊导致打分飘
- **连续分优于布尔分**，能反映细微改善
- **关注相对变化而非绝对分值** —— 裁判有系统性偏差，但同一裁判做 A/B 对比时偏差会抵消
- 要**抽样人工校验裁判本身**（meta-evaluation），确认裁判和人的判断一致

---

**Q7：RAG 系统你会评哪些指标？各自诊断什么问题？**

*考察点：这是 RAG 岗位的高频核心题。要能体现「可归因」的思路。*

至少三个（本项目用的就是这三个）：

| 指标 | 看什么 | 需要的输入 |
|---|---|---|
| **Retrieval Relevance** | 召回的片段跟问题相不相关 | question + context |
| **Groundedness / Faithfulness** | 答案每句话是否都有检索资料支撑 → **幻觉检测** | context + answer |
| **Answer Helpfulness / Relevance** | 答案是否切题、真正回答了用户的问题 | question + answer |

**关键是它们能交叉定位问题**：

```
retrieval_relevance 低                    → 检索环节烂，改 prompt 白费力气
                                            去调 chunkSize / k / embedding 模型 / 上混合检索
retrieval_relevance 高 + groundedness 低  → 资料对但模型在编造
                                            强化 prompt 约束 / 降温度 / 换模型
groundedness 高 + helpfulness 低          → 没编造但答偏了 / 太保守老说"不知道"
                                            改 prompt 措辞、检查问题理解
```

**可以补充的指标**：
- **Correctness**：答案 vs 人工标注的标准答案（**这个需要 `referenceOutputs`**，前三个都不需要，属于「无参考评测」）
- **Context Recall**：标准答案所需的信息是否都被召回了（衡量漏召回）
- 工程侧的**延迟**和**token 成本** —— 效果好但一次 30 秒 / 一毛钱，业务上也不可用

---

**Q8：`evaluate()` 内部做了什么？为什么返回值要 `for await` drain 一遍？**

*考察点：有没有真踩过这个坑。踩过的人才答得出。*

`evaluate(target, { data, evaluators, ... })` 做四件事：
1. 从 LangSmith 拉取数据集的所有 Example
2. 按 `maxConcurrency` 并发，逐条调 `target(inputs)` 得到 outputs（这一步本身也会产生 Trace）
3. 把 `{ inputs, outputs, referenceOutputs }` 交给每个 evaluator 打分
4. 分数作为 Feedback 写回 LangSmith，整体归到一个新建的 Experiment 下

**必须 drain 的原因**：返回值是**异步可迭代对象，懒执行**。不迭代它，任务不一定被推进/完成，脚本可能在样例跑完前就 `process.exit`，结果不全甚至实验是空的。所以：

```js
for await (const _row of result) { /* drain */ }
// 汇总日志必须放在 drain 之后，否则打印的是不完整的状态
```

---

### 实战篇

---

**Q9：线上 RAG 用户反馈"答得不对"，你怎么用 LangSmith 排查？**

*考察点：完整的排障方法论。这题最能区分「用过」和「看过文档」。*

分五步：

1. **定位 Trace**：按时间 / 用户 id / 会话 id 筛（前提是接入时就把这些作为 **metadata 或 tag** 打在 Trace 上 —— 这是设计阶段就要考虑的，不然线上根本找不到那一条）
2. **展开 Run 树，先看 `retrieve` 的输出**：正确答案所在的片段有没有被召回？
   - **没召回到** → 检索问题。往下查 chunkSize 是否把答案切断了、k 是否太小、embedding 模型是否匹配、是否需要关键词/混合检索
   - **召回到了** → 进第 3 步
3. **看 LLM Run 的实际输入**：`ChatPromptTemplate` 渲染出的完整 prompt 是什么？常见发现：`{context}` 变量是空的（字段名传错，纯 bug）、context 太长关键片段被挤到中间（**lost in the middle**）、prompt 约束太弱
4. **看 LLM Run 的输出**：是幻觉、还是过于保守答了"不知道"、还是格式没按要求
5. **把这条 case 存进 Dataset**（LangSmith 支持 Trace → Dataset 一键添加），修完之后跑 `evaluate` 验证，**同时确认没让其他样例退化**

第 5 步是重点：**排查的终点不是"修好了这一条"，而是"这一条进了回归集，以后不会再犯"。**

---

**Q10：怎么用 LangSmith 做 prompt / 模型的 A/B 对比？**

*考察点：评测驱动迭代的工程习惯。*

流程：

1. **固定数据集**（`rag-eval-v1`）和**固定 evaluators** —— 唯一变量原则，对比的前提是除被测项外一切不变
2. 跑基线实验，`experimentPrefix` 编码进版本信息：`rag-qwen-plus-promptv1`
3. 改一个变量（换模型 / 改 prompt / 调 k），再跑：`rag-qwen-max-promptv1`
4. 在 LangSmith 上**勾选两个实验并排 diff**

**看报告的要点**（这里是加分处）：

- 不能只看平均分。要**逐条看 diff**：平均分涨了 0.05，可能是 8 条微涨、2 条暴跌 —— 那 2 条暴跌可能正是最重要的核心场景，这个改动其实不能上
- **同时看成本和延迟**：换大模型分数涨 3% 但成本翻 4 倍、延迟翻倍，业务上通常不划算
- 数据集小的时候，**几个百分点的差异可能只是噪音**。要么扩大数据集，要么同一配置跑多次看方差，别对小波动过度反应
- 裁判模型和裁判 prompt **在对比期间绝对不能变**，否则两次实验的分数不可比

---

**Q11：数据集怎么建？多少条合适？**

*考察点：有没有真做过评测，还是只会跑 demo。*

**来源，按价值排序**：

1. **线上答错的真实 case**（最有价值）—— 从 Trace 里挑，一键存成 Example。这是真实分布，也是真实痛点
2. **人工编写覆盖核心意图**的用例，初期冷启动用
3. **已知的边界和坑**：边界数值、易混淆的相似问题（比如"无理由退货"vs"质量问题换货"，运费承担方不同，最容易答混）
4. LLM 批量生成 —— 可以做规模，但**必须人工审核**，否则标准答案本身就是错的，评测全废

**规模**：不是越大越好。初期 20~50 条覆盖核心场景就很有用。要权衡：每条样例的成本 = 1 次系统调用 + N 次 judge 调用（本项目 3 个 judge，所以是 4~5 次模型调用），50 条就是 200+ 次调用。数据集大到每次评测要跑一小时，就没人愿意跑了，评测也就失去了「快速反馈」的意义。

**分层是个好实践**：一个小的 smoke set（10 条，每次提交都跑）+ 一个大的 full set（100+ 条，发布前跑）。

---

**Q12：接入 LangSmith 有什么数据安全 / 合规风险？怎么处理？**

*考察点：生产意识。很多候选人完全没想过这层，答出来是明显加分。*

**风险**：默认情况下，**完整的输入输出都上报到 LangSmith 云端**。这里面可能包含用户手机号、订单号、病历、内部文档全文 —— 等于把敏感数据传给了第三方 SaaS。

**处理手段，按强度排序**：

1. **分环境开关**：开发/测试环境开 Tracing，生产环境按需（`LANGCHAIN_TRACING_V2` 控制）
2. **字段脱敏**：用 `hideInputs` / `hideOutputs` 回调，上报前把敏感字段脱敏或整体屏蔽，只保留结构和指标
3. **采样**：生产只上报一小部分 Trace，降低暴露面同时保留统计价值
4. **Self-hosted LangSmith**（企业版）：完全部署在自己的 VPC 内，数据不出网。金融、医疗类业务基本只能走这条

另外一个必须提的点：**API key 不能进代码仓库**。本项目里 `LANGCHAIN_API_KEY` 只放在 `.env`（gitignore），`.env.example` 里应该只写占位符 `xxx`。key 泄露到 git 历史里很难彻底清除。

---

**Q13：`traceable()` 什么时候用？**

*考察点：知不知道自动埋点的边界。*

自动埋点只覆盖 LangChain 的 Runnable。**Trace 里出现「断层」时就该用 `traceable()`**，典型场景：

- 自己 `fetch` 调的第三方 API（重排模型、外部搜索、内部微服务）
- 纯 OpenAI SDK 写的调用（没用 LangChain）
- 想把一段业务逻辑作为一个可观测单元（比如「解析用户意图」这个由几个函数拼起来的步骤）

```js
import { traceable } from "langsmith/traceable";

const rerank = traceable(
  async (query, docs) => { /* fetch DashScope rerank */ },
  { name: "dashscope_rerank", run_type: "tool" },
);
```

包完之后它就作为一个 Run 出现在树上，有输入输出和耗时。`run_type` 建议标准确（`llm` / `retriever` / `tool` / `chain`），LangSmith 会按类型给不同的 UI 展示和统计（比如 `llm` 类型才统计 token）。

---

**Q14：怎么把评测接进 CI？**

*考察点：工程闭环意识。*

思路是**把 LLM 评测当成一种「带阈值的测试」**：

1. 用小的 smoke dataset（10~20 条）保证 CI 跑得快、成本可控
2. CI 里跑 `evaluate`，拿到各指标平均分
3. **和基线比对，设阈值门禁**：比如 `groundedness < 0.8` 或「相比上一个版本下降超过 5%」就 fail
4. 报告链接贴到 PR comment 里，人工可点进去逐条看

**要注意的现实问题**（说出来体现真做过）：
- **成本**：每次 CI 都烧 token，不能挂在每个 commit 上，一般只在 PR 或 nightly 跑
- **波动**：即使 `temperature: 0`，模型服务端也可能有细微不确定性。阈值不能定得太死，否则天天误报变成"狼来了"，最后大家都去点 skip
- **外部依赖**：评测依赖模型 API 和向量库，CI 环境要能连通，API 挂了不能算代码的错（要区分 infra failure 和 quality regression）

---

**Q15：Tracing 和传统 APM / 日志的区别？为什么不能只用日志？**

*考察点：能不能讲清 LLM 可观测性的特殊性。*

| | 传统日志 / APM | LLM Tracing |
|---|---|---|
| 结构 | 扁平文本，靠 requestId 串 | 天然树形，父子关系明确 |
| 埋点 | 手动写 log | 框架自动，全量输入输出 |
| 记录内容 | 你想到要记的那部分 | **每一层完整的 prompt 和 completion** |
| 特有指标 | QPS / P99 / 错误率 | **token 数、成本、模型版本、温度** |
| 「失败」定义 | 抛异常、5xx | **不报错但答得不对** —— 日志根本发现不了 |
| 配套能力 | 告警、大盘 | Trace → Dataset → 评测的**迭代闭环** |

核心区别在最后两行：**LLM 应用的主要失败模式是静默的质量问题，而不是异常。** 日志只能告诉你「没报错」，Trace 能让你看到「第 3 层那次 LLM 调用收到的 prompt 里 context 是空的」。而且 Trace 能直接转成评测用例，形成「发现问题 → 固化成测试 → 修复 → 验证不退化」的闭环，这是日志系统完全不具备的。

实践上两者共存，不互相替代：APM 管基础设施层（CPU、DB、HTTP），Tracing 管 LLM 链路层。

---

## 八、一句话复述（记忆锚点）

> LangSmith 干两件事：**「看」和「量」**。
> **看**靠 Tracing —— 配 `LANGCHAIN_TRACING_V2` / `LANGCHAIN_API_KEY` / `LANGCHAIN_PROJECT` 三个环境变量，LangChain 就自动往全局 callback 注册 tracer，把每层 Runnable 的输入输出/耗时/token/报错录成 Run 树，异步批量上报；RAG 答错时展开 Run 树，看 `retrieve` 输出就能分清是**召回失败**还是**生成失败**。
> **量**靠 Evaluation —— `build_dataset` 建固定数据集（`inputs` 问题 + `outputs` 标准答案），`evaluators` 用 `openevals` 内置 prompt 造三个 `temperature: 0` 的 LLM 裁判（**忠实度 / 有用性 / 检索相关性**，三者交叉可归因），`run_eval` 调 `evaluate()` 逐条跑 `ask()` 并把 `Document` 转纯文本喂给裁判，**记得 `for await` drain 否则结果不全**，`experimentPrefix` 编码版本信息以便跨实验 diff。
> 最后的闭环是：**线上 Trace 发现坏 case → 存进 Dataset → 修 → 跑 evaluate 确认变好且没让别的退化。**
