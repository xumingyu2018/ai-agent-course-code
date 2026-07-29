import { existsSync, unlinkSync } from "node:fs";

import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { SqliteSaver } from "@langchain/langgraph-checkpoint-sqlite";

const dbPath = "./src/checkpointer-demo.sqlite";

const StateAnnotation = Annotation.Root({
  visitCount: Annotation({
    reducer: (_prev, next) => next,
    default: () => 0,
  }),
  message: Annotation({
    reducer: (_prev, next) => next,
    default: () => "",
  }),
});

function recordVisit(state) {
  const visitCount = state.visitCount + 1;
  const message =
    visitCount === 1
      ? "这是你在本会话里第 1 次进入。"
      : `这是你在本会话里第 ${visitCount} 次进入`;
  return { visitCount, message };
}

const graph = new StateGraph(StateAnnotation)
  .addNode("recordVisit", recordVisit)
  .addEdge(START, "recordVisit")
  .addEdge("recordVisit", END);

if (existsSync(dbPath)) {
  unlinkSync(dbPath);
}

// SqliteSaver.fromConnString 作用是根据数据库连接字符串创建一个 SqliteSaver 实例，用于将状态图的状态保存到 SQLite 数据库中。这样可以在不同的会话中持久化状态，使得用户在多次访问时能够继续使用之前的状态，而不是每次都从头开始。
const checkpointer = SqliteSaver.fromConnString(dbPath);
const app = graph.compile({ checkpointer });

const user1 = { configurable: { thread_id: "用户-小张" } };
const user2 = { configurable: { thread_id: "用户-小李" } };

const res1 = await app.invoke({}, user1);
const res2 = await app.invoke({}, user1);
const res3 = await app.invoke({}, user1);
const res4 = await app.invoke({}, user2);

console.log(res1);
console.log(res2);
console.log(res3);
console.log(res4);
