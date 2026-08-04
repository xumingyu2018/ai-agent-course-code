import "dotenv/config";
import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence } from "@langchain/core/runnables";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { Milvus } from "@langchain/community/vectorstores/milvus";

const embeddings = new OpenAIEmbeddings({
  apiKey: process.env.OPENAI_API_KEY,
  configuration: { baseURL: process.env.OPENAI_BASE_URL },
  model: process.env.EMBEDDING_MODEL ?? "text-embedding-v3",
});

const llm = new ChatOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  configuration: { baseURL: process.env.OPENAI_BASE_URL },
  model: process.env.MODEL_NAME ?? "qwen-plus",
  temperature: 0,
});

const vectorStore = await Milvus.fromExistingCollection(embeddings, {
  collectionName: process.env.MILVUS_COLLECTION ?? "rag_docs",
  url: process.env.MILVUS_URI ?? "http://localhost:19530",
});

const retriever = vectorStore.asRetriever({ k: 4 });

const prompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    "你是客服助手。仅根据下面「上下文」回答；上下文没有的信息请明确说不知道，不要编造。\n\n上下文：\n{context}",
  ],
  ["human", "{question}"],
]);

// 将 prompt、llm 和输出解析器组合成一个可运行的序列
const chain = RunnableSequence.from([prompt, llm, new StringOutputParser()]);

const GraphState = Annotation.Root({
  question: Annotation,
  context: Annotation,
  answer: Annotation,
});

// 检索graph节点：从向量数据库中检索相关文档
async function retrieve(state) {
  const docs = await retriever.invoke(state.question);
  return { context: docs };
}

// 生成graph节点：根据检索到的上下文和用户问题生成答案
async function generate(state) {
  const contextText = state.context.map((d) => d.pageContent).join("\n\n");
  const answer = await chain.invoke({
    context: contextText,
    question: state.question,
  });
  return { answer };
}

const workflow = new StateGraph(GraphState)
  .addNode("retrieve", retrieve)
  .addNode("generate", generate)
  .addEdge(START, "retrieve")
  .addEdge("retrieve", "generate")
  .addEdge("generate", END);

export const ragApp = workflow.compile();

export async function ask(question) {
  const result = await ragApp.invoke({ question });
  return {
    answer: result.answer,
    context: result.context ?? [],
  };
}
