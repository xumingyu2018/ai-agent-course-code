import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";
import {
  createAgent,
  HumanMessage,
  todoListMiddleware,
} from "langchain";

const model = new ChatOpenAI({
  model: process.env.MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  temperature: 0,
  configuration: { 
    baseURL: process.env.OPENAI_BASE_URL
  }
});

const agent = createAgent({
  model,
  tools: [],
  systemPrompt:
    "你是生活规划助手。收到需要多步完成的请求时，先用 write_todos 列出中文执行步骤，然后简要说明你的计划。",
  middleware: [todoListMiddleware()], // todoListMiddleware 中间件，帮助将复杂任务拆解为可执行的步骤，自带了 write_todos 的 tool，会生成 todo 列表写到 graph 的 state 里
});

const query =
  "我下周末想带爸妈去杭州玩两天，帮我规划一下：交通怎么选、住哪里方便、必去景点和吃什么，预算控制在人均 1500 元左右。";

const result = await agent.invoke({
  messages: [new HumanMessage(query)],
});

console.log("todos:", JSON.stringify(result.todos, null, 2));
console.log("─".repeat(50));
console.log("回复:", result.messages.at(-1)?.content);
