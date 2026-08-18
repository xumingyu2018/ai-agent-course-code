# Deep Agents + Langfuse（Trace + 评测）

Node.js demo：Deep Agent 调用 LLM / 工具，Trace 打到 Langfuse；另有一键离线评测（Dataset + Experiment）。

## 快速开始

```bash
cp .env.example .env   # 填 LANGFUSE_* 与 OPENAI_API_KEY
npm install
npm run demo           # 单次调用 + Trace
npm run eval           # Dataset 评测 + Scores
```

## 结构

```
src/
  instrumentation.mjs   # OTEL + LangfuseSpanProcessor（最先加载）
  agent.mjs             # 工具 + Deep Agent（demo / eval 共用）
  index.mjs             # 单次 demo + CallbackHandler
  evaluate.mjs          # Dataset → Experiment → Evaluators
```

## Trace（`npm run demo`）

跑完后在 Langfuse **Traces** 里看 tag `deepagents`。

## 评测（`npm run eval`）

1. 创建/复用 Dataset（默认名 `deepagents-eval`）并 upsert 测试用例  
2. `dataset.runExperiment` 对每条用例跑 Agent（带 CallbackHandler）  
3. Item 级打分：`keyword_hit`、`non_empty`  
4. Run 级汇总：`avg_keyword_hit`  
5. 在 Langfuse **Datasets → deepagents-eval → Runs** 查看结果与对比  

可用环境变量 `LANGFUSE_DATASET_NAME` 覆盖 Dataset 名称。
