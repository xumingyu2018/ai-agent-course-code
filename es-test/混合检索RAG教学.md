# 混合检索 RAG 教学文档（逐行解读 08_hybrid-retrieval.mjs）

> 面向刚接触 AI 应用开发的同学。读完你会明白：什么是 RAG、为什么要「混合检索」、什么是「多路召回 + 重排」，以及 LangGraph 是怎么把整条流水线编排起来的。
>
> 涉及文件：
> - `src/rag/08_hybrid-retrieval.mjs` —— 主流程（本文重点）
> - `src/rag/06_query-augment.mjs` —— LLM 查询扩展
> - `src/rerank/03_dashscope-rerank.mjs` —— 自封装的重排模型
> - `src/rag/05_seed-data.mjs` —— 种子数据（往 ES 和 Milvus 灌同一批笔记）

---

## 一、先搞懂几个概念（小白必读）

### 1. 什么是 RAG？

RAG = Retrieval-Augmented Generation（检索增强生成）。大模型自己不知道你的私有数据（比如你的生活笔记），所以回答前先去你的知识库里**检索**相关内容，把检索到的片段塞进提示词里，让模型**照着资料回答**。一句话：

> **先查资料，再答题（开卷考试），而不是闭卷瞎编。**

### 2. 两种检索方式，各有强弱

| | 关键词检索（ES） | 向量检索（Milvus） |
|---|---|---|
| 原理 | 分词 + 倒排索引 + BM25 打分 | 文本转向量，找「距离最近」的向量 |
| 强项 | 精确匹配：型号、订单号、专有名词（如 `PO-20250409-K9`） | 语义匹配：「睡不着」能查到「失眠」笔记，字面完全不同也行 |
| 弱项 | 换个说法就查不到（「无线断流」查不到「路由器断网」） | 对随机字符串（序列号）几乎无能为力 |

**混合检索（Hybrid Retrieval）= 两路一起查，取长补短。** 这就是本文件名字的由来。

### 3. 召回（Recall）和重排（Rerank）

搜索系统的经典两段式：

- **召回**：先用便宜、快的方法**宽进**——从海量数据里捞出一批「可能相关」的候选（本例每路最多 15 条）
- **重排**：再用贵、准的专用模型**严出**——对候选逐条精细打分，只留最相关的前几条（本例留 3 条）

为什么不直接用重排模型查全库？因为重排模型要把「问题 + 每篇文档」成对送进神经网络算分，太慢太贵，只适合处理小批量候选。

### 4. 查询扩展（Query Augmentation）

用户的问题往往很口语化（「家里无线老是断断续续的咋整啊」），直接拿去检索命中率低。解决办法：**先让 LLM 把问题改写成 3 条不同角度的书面问句**（比如「路由器断流怎么排查」「WiFi 频繁掉线的解决方法」…），每条都去查一遍，扩大命中面。

### 5. 把上面四个概念串起来，就是本文件的完整流水线

```
用户问题
   │
   ▼
① query_augment   LLM 改写出 3 条问句（+原始问题共 4 条检索串）
   │
   ├──────────────┬──────────────┐
   ▼              ▼              │ （两路并行）
② es_recall    ③ milvus_recall  │
   ES 关键词召回    Milvus 向量召回  │
   └──────────────┴──────────────┘
   ▼
④ merge          合并两路结果，按 id 去重
   ▼
⑤ rerank         qwen3-rerank 精排，只留 top 3
   ▼
⑥ generate_answer  把 3 条片段塞进 prompt，LLM 生成最终回答
```

---

## 二、LangGraph：为什么需要它，它解决什么问题

上面 6 步当然可以写成 6 个函数顺序调用，但有两个需求普通代码写起来别扭：

1. **并行**：②③两路召回互不依赖，应该同时跑
2. **状态共享**：每一步都要读/写中间结果（问句列表、两路命中、合并结果…）

LangGraph 的做法是把流程建模成**状态图（StateGraph）**：

- **State（状态）**：一个共享的「白板」，所有节点从上面读数据、往上面写数据
- **Node（节点）**：一个个处理函数，输入当前 state，返回「要更新的字段」
- **Edge（边）**：声明节点的先后关系，框架自动按图调度（包括并行）

### 状态定义（第 22-30 行）

```js
const HybridRetrievalState = Annotation.Root({
  query: Annotation(),             // 用户原始问题
  queryAugmentation: Annotation(), // LLM 生成的多角度问句
  esHits: Annotation(),            // ES 检索结果
  milvusHits: Annotation(),        // Milvus 检索结果
  merged: Annotation(),            // 合并去重后的文档
  topDocuments: Annotation(),      // 重排后保留的文档
  answer: Annotation(),            // 最终回答
});
```

`Annotation.Root({...})` 声明白板上有哪些格子。每个节点只需返回自己负责的格子，例如 `return { esHits: ... }`，LangGraph 会自动合并进全局 state —— 节点之间**不直接调用对方**，全靠白板传数据。

### 图的组装（第 209-216 行）

```js
.addEdge(START, "query_augment")            // 入口 → 查询扩展
.addEdge("query_augment", "es_recall")      // 扩展完 → ES 召回
.addEdge("query_augment", "milvus_recall")  // 扩展完 → Milvus 召回（和上面一条同时触发 = 并行）
.addEdge(["es_recall", "milvus_recall"], "merge")  // ★两路都完成才进 merge（汇合点）
.addEdge("merge", "rerank")
.addEdge("rerank", "generate_answer")
.addEdge("generate_answer", END)
```

两个关键写法：

- **一个节点出两条边** = 并行分支（es_recall 和 milvus_recall 同时执行）
- **`addEdge([A, B], C)`（数组写法）** = 汇合等待：C 要等 A、B **全部完成**才执行，相当于 `Promise.all`

`.compile()` 之后得到可执行对象，`graph.invoke({ query })` 一把跑完全图，返回最终 state。

---

## 三、逐节点精讲

### 节点① query_augment —— LLM 查询扩展（配合 06_query-augment.mjs）

```js
.addNode("query_augment", async (state) => ({
  queryAugmentation: await augmentQuery(chatModel, state.query ?? ""),
}))
```

`augmentQuery` 内部（06_query-augment.mjs）有三个值得学习的技巧：

**技巧 1：结构化输出（withStructuredOutput）**

```js
const QueryAugmentationSchema = z.object({
  queries: z.array(z.string()).length(3).describe("恰好 3 条中文检索问句…"),
});
const structured = chatModel.withStructuredOutput(QueryAugmentationSchema);
```

不让模型自由发挥输出一段文字，而是用 zod schema **强制它返回 `{queries: [3 条字符串]}` 的 JSON**。`.describe()` 里的文字会作为字段说明传给模型。这是让 LLM 输出「程序可直接使用的数据」的标准做法。

**技巧 2：提示词里的关键约束**

> 「专有名词、型号、订单号等必须保留原样」

没有这句，模型改写时可能把 `PO-20250409-K9` 这种编号改丢，ES 的精确匹配优势就废了。

**技巧 3：兜底（normalizeThreeQueries + try/catch）**

模型偶尔抽风（返回不足 3 条 / 请求失败），这时用原始问题补位，保证后续流程永远拿到 3 条 —— **对 LLM 的输出永远不要假设 100% 符合预期**。

最后 `retrievalQueryStrings(original, augmentation)` 把「原始问题 + 3 条改写」拼成 **4 条检索串**（原始问题也要查！万一改写全跑偏了，原始问题是保底）。

### 节点② es_recall —— ES 关键词召回

```js
const qs = retrievalQueryStrings(state.query, state.queryAugmentation); // 4 条检索串
const kEach = Math.max(2, Math.ceil(ES_K / n)); // 15 / 4 ≈ 每条查 4 条
const batches = await Promise.all(
  qs.map((q) => esClient.search({
    index: INDEX,
    size: kEach,
    query: {
      multi_match: {
        query: q,
        fields: ["note_title^2", "note_body", "title", "content"],
        type: "best_fields",
        analyzer: "ik_smart",
      },
    },
  })),
);
```

要点逐个拆：

- **配额均摊**：总预算 `ES_K = 15` 条，平分给 4 条检索串，每条取 `⌈15/4⌉ = 4` 条 —— 防止总量爆炸
- **`Promise.all`**：4 条检索串并发查询，不是一条条排队
- **`multi_match`**：一个问句同时在多个字段里搜
- **`note_title^2`**：`^2` 是**权重加倍** —— 标题命中比正文命中更重要（想想你自己搜笔记，标题匹配基本就是想要的那条）
- **`type: "best_fields"`**：取匹配得分最高的那个字段作为文档得分（适合「答案通常集中在某一个字段」的场景）
- **`analyzer: "ik_smart"`**：查询侧用粗粒度中文分词，减少碎词噪音（写入侧在 05_seed-data 里用的是细粒度 `ik_max_word`，一细一粗是经典搭配）
- **`docFromEsHit`（第 32-41 行）**：把 ES 返回的 hit 转成 LangChain 统一的 `Document` 对象（`pageContent` + `metadata`），并在 metadata 里记下 `id` 和 `source: "es"` —— 统一成 Document 后，后面的合并、重排、生成才能不区分来源地处理

### 节点③ milvus_recall —— Milvus 向量召回

```js
const batches = await Promise.all(
  qs.map((q) => milvus.similaritySearch(q, kEach)),
);
```

比 ES 那路短得多，因为用了 LangChain 的 `Milvus` vector store 封装（第 227-232 行）：

```js
const milvus = await Milvus.fromExistingCollection(embeddings, {
  url: "http://localhost:19530",
  collectionName: "life_notes",
  textField: "doc_text",     // 哪个字段存原文
  vectorField: "embedding",  // 哪个字段存向量
});
```

`similaritySearch(q, k)` 一行内部做了三件事：**把问句 q 用 embedding 模型转成向量 → 去集合里做近似最近邻搜索 → 把结果包成 Document 返回**。注意这里连接的是 05_seed-data.mjs 建好的现有集合（`fromExistingCollection`），embedding 模型必须和灌数据时**同一个**（text-embedding-v3），否则向量空间对不上，搜出来全是错的。

### 节点④ merge —— 合并去重

```js
function merge(esDocs, milvusDocs) {
  const combined = [...esDocs, ...milvusDocs].filter((d) => d?.pageContent);
  return dedupeDocsById(combined);
}
```

同一条笔记很可能被两路同时召回（这恰恰说明它相关性高），必须去重，否则重排和生成阶段会看到重复内容。去重策略（`dedupeDocsById`，第 52-65 行）：

- 用 `Set` 记录见过的 `metadata.id`，**只按 id 去重**（两边数据源灌的是同一批 id，所以 id 是可靠的对齐键）
- 保留**首次出现**的那条（ES 结果拼在前面，所以优先保留 ES 版本）
- 没有 id 的文档直接丢弃 —— 宁缺毋滥

### 节点⑤ rerank —— 重排精选（配合 03_dashscope-rerank.mjs）

```js
if (!merged.length) return { topDocuments: [] };
const topDocuments = await reranker.compressDocuments(merged, state.query);
```

合并后可能有 20+ 条候选，全部塞给 LLM 有两个问题：**上下文太长**（费 token、模型容易被无关内容带偏），且**两路的分数没法比**（ES 的 BM25 分和 Milvus 的向量距离量纲完全不同，无法直接排序）。

重排模型（qwen3-rerank）解决这个问题：把「原始问题 + 每条候选」成对送入，输出统一的相关性分数，取 `topN: 3`。

注意一个细节：**重排用的是原始问题 `state.query`，不是改写后的问句** —— 改写是为了「查得到」，最终判断「哪条最相关」还是要以用户的原话为准。

`DashScopeRerank` 是自己封装的类（LangChain 没有现成的 qwen 重排封装），继承 `BaseDocumentCompressor` 基类、实现 `compressDocuments(docs, query)` 方法，内部就是一次 fetch 调 DashScope 的 rerank API，拿回索引后 `results.map((item) => documents[item.index])` 还原成文档列表。

### 节点⑥ generate_answer —— 生成回答

```js
if (!docs.length) {
  const chain = NO_CONTEXT_PROMPT.pipe(chatModel);   // 没查到 → 礼貌说不知道
  ...
}
const chain = ANSWER_PROMPT.pipe(chatModel);          // 查到了 → 照资料回答
const msg = await chain.invoke({ query, context: formatDocsAsContext(docs) });
```

三个要点：

- **ANSWER_PROMPT 的系统提示词是 RAG 防幻觉的关键**：「只根据检索片段推断答案；片段里没有的信息不要编造；不足以回答就明说」—— 这几句直接决定 RAG 回答的可信度
- **formatDocsAsContext**：把 3 条文档拼成带编号的上下文（`[1] id=life_04 source=es\n正文…`），编号方便模型引用，`---` 分隔防止片段互相粘连
- **空结果单独走 NO_CONTEXT_PROMPT**：与其让模型对着空上下文瞎编，不如明确告诉它「没查到，引导用户换说法」—— 宁可说不知道，不可胡说

另外 `stringifyMessageContent`（第 93-101 行）处理了一个兼容性问题：模型返回的 `content` 可能是字符串，也可能是内容块数组（多模态格式），统一抹平成字符串。

---

## 四、组件初始化（第 219-249 行）

| 组件 | 作用 | 关键配置 |
|---|---|---|
| `esClient` | ES 连接 | `http://localhost:9200`（docker） |
| `embeddings` | 问句转向量 | `text-embedding-v3`，走 DashScope 兼容接口，**必须与灌数据时一致** |
| `milvus` | 向量库连接 | `fromExistingCollection` 挂到已存在的 `life_notes` 集合 |
| `reranker` | 重排 | `qwen3-rerank`，`topN: 3` |
| `chatModel` | 查询扩展 + 最终回答共用 | `qwen-turbo`，`temperature: 0.2`（低随机性，检索问答要稳定不要发散） |

## 五、怎么跑起来

前置条件：

```bash
# 1. docker 里 ES(:9200，装了 ik 分词插件) 和 Milvus(:19530) 已启动
# 2. .env 配好 OPENAI_API_KEY / OPENAI_BASE_URL（DashScope）
# 3. 先灌数据（建索引 + 建集合 + 写入 10 条笔记）
node src/rag/05_seed-data.mjs

# 4. 跑混合检索
node src/rag/08_hybrid-retrieval.mjs
```

运行后按顺序打印：mermaid 流程图 → LLM 改写的 4 条检索串 → ES 命中列表 → Milvus 命中列表 → 重排保留的 3 条 → 最终回答。

**推荐实验**（改 `SAMPLE_QUERIES` 里的注释，体会两路检索的差异）：

| 测试问题 | 预期现象 |
|---|---|
| `"PO-20250409-K9 滤芯订单"` | ES 靠订单号精确命中 life_05，Milvus 这路基本没用 —— 关键词检索的主场 |
| `"家里无线老是断断续续的咋整啊"` | 口语化表达，靠查询扩展 + 向量语义命中 life_04 路由器笔记 —— 向量检索的主场 |
| `"那个黑凉粉粉怎么冲不结块"` | 「黑凉粉」≈「龟苓膏」，纯字面对不上，考验语义召回 |

## 六、常见疑问（FAQ）

**Q1：为什么原始问题也要参与检索，不是已经改写了吗？**
改写可能跑偏。原始问题是保底，4 条一起查，宁多勿漏 —— 召回阶段的哲学就是「宽进」，反正后面有重排把关。

**Q2：为什么去重只按 id，不按内容？**
两边数据源是同一批数据、id 严格对齐，按 id 最快最准。如果数据源不同（比如网页抓取），才需要按内容指纹去重。

**Q3：ES 和 Milvus 的分数为什么不能直接加权融合？**
BM25 分数无上界、向量距离是另一个量纲，直接加权没有意义。业界要么用 RRF（按排名倒数融合），要么像本例一样交给重排模型统一打分 —— 重排是效果最好的方案。

**Q4：ES_K / MILVUS_K = 15、topN = 3 这些数怎么定的？**
经验值。召回量太小容易漏（召回率低），太大重排慢且贵；最终留几条取决于回答需要多少上下文。生产中通常召回 50~100、重排后留 3~10。

**Q5：LangGraph 在这里是必须的吗？**
不是必须，手写 `Promise.all` 也能实现。但图的写法让流程**声明式、可视化**（drawMermaid 直接出流程图）、每个节点可独立测试，加节点（比如加一路检索、加缓存）只需改边的声明 —— 流程复杂后优势明显。

## 七、一句话复述（记忆锚点）

> 用户问题先由 LLM **改写成 3 条问句**（结构化输出 + 保留专有名词），加上原始问题共 4 条，**每条并行**查 ES（ik 分词 + multi_match，标题加权）和 Milvus（同款 embedding 的 similaritySearch），两路结果**按 id 合并去重**，交给 **qwen3-rerank 用原始问题统一打分**只留 top 3，最后塞进「只准照资料回答」的 prompt 让 LLM 生成答案；整条流水线用 LangGraph 状态图编排 —— **数组边 `[A,B]→C` 实现并行汇合，state 白板传递中间结果**。
