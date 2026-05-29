# 深度调研助手

综合 DeepAgents 能力的实战示例：任务规划、文件系统、分层子 Agent、Skills、长期记忆、REPL 数据分析、流式进度。**默认全中文输出。**

## 能力覆盖

| DeepAgents 能力 | 在本项目中的用途 |
|----------------|-----------------|
| `write_todos` | 拆解调研任务、跟踪进度（中文待办） |
| 文件系统 | `workspace/sources/` 存原始资料，`workspace/reports/` 存报告 |
| 子 Agent | researcher（调研员）、editor（编辑）、analyst（分析师） |
| Skills | `web-research`、`report-writer` 按需加载 |
| Memory | `AGENTS.md` 加载中文报告偏好 |
| REPL | analyst 子 Agent 用 QuickJS 做数值计算 |
| Streaming | CLI 实时输出各 Agent 执行步骤 |

## 架构

```
主 Agent（深度调研助手）
  ├── 技能: web-research / report-writer
  ├── 记忆: AGENTS.md
  ├── 子 Agent: researcher  → 联网搜索
  ├── 子 Agent: editor      → 审稿
  └── 子 Agent: analyst     → QuickJS REPL
```

## 快速开始

在本目录下独立安装依赖并运行：

```bash
# 安装依赖
pnpm install

# 配置环境变量
cp .env.example .env
# 编辑 .env，填入 OPENAI_API_KEY（必填）、BOCHA_API_KEY（必填）

# 运行
pnpm start "调研 2026 年 AI Agent 框架对比：LangGraph、DeepAgents、AutoGen"

# 交互式输入主题
pnpm start
```

## 查看产出

- 报告：`workspace/reports/`
- 原始资料：`workspace/sources/`

## 典型工作流

1. 主 Agent 用 `write_todos` 规划任务（中文待办）
2. 按 `web-research` 技能写 `research_plan.md`，并行启动调研员
3. 若有数值分析需求，委派 analyst
4. 综合 findings 写草稿报告
5. editor 审稿 → 修订 → 保存终稿

## 项目结构

```
deep-research-assistant/
  AGENTS.md              # 长期记忆（中文报告偏好）
  src/
    agent.mjs            # Agent 工厂（含模型配置与中文 prompt）
    cli.mjs              # CLI 入口
    tools/search.mjs     # Bocha 联网搜索
  skills/
    web-research/SKILL.md
    report-writer/SKILL.md
  workspace/
    sources/             # 调研计划、原始资料
    reports/             # 草稿与终稿
```

## 自定义

- **报告偏好**：编辑 `AGENTS.md`
- **调研流程**：编辑 `skills/web-research/SKILL.md`
- **报告模板**：编辑 `skills/report-writer/SKILL.md`
- **子 Agent 行为**：编辑 `src/agent.mjs` 中的 system prompt

## 环境变量

| 变量 | 必填 | 说明 |
|------|------|------|
| `OPENAI_API_KEY` | 是 | OpenAI（或兼容 API）密钥 |
| `OPENAI_BASE_URL` | 否 | 自定义 API 地址 |
| `OPENAI_MODEL` | 否 | 模型名，默认 `gpt-4o` |
| `BOCHA_API_KEY` | 是 | Bocha 搜索密钥 |
| `RECURSION_LIMIT` | 否 | 递归上限，默认 `300` |

`.env` 示例：

```env
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
OPENAI_MODEL=qwen-plus
BOCHA_API_KEY=你的_bocha_key
RECURSION_LIMIT=500
```
