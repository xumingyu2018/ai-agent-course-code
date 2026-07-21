import "dotenv/config";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { RunnableSequence, RunnableLambda } from "@langchain/core/runnables";
import { MilvusClient, MetricType } from "@zilliz/milvus2-sdk-node";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";

const COLLECTION_NAME = "ebook_collection";
const VECTOR_DIM = 1024;

// 初始化 OpenAI Chat 模型
const model = new ChatOpenAI({
  temperature: 0.7,
  modelName: process.env.MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
});

// 初始化 Embeddings 模型
const embeddings = new OpenAIEmbeddings({
  apiKey: process.env.OPENAI_API_KEY,
  model: process.env.EMBEDDINGS_MODEL_NAME,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
  dimensions: VECTOR_DIM,
});

// 初始化原生 Milvus 客户端
const milvusClient = new MilvusClient({
  address: "localhost:19530",
});

// 从 Milvus 中检索内容的 Runnable
const milvusSearch = new RunnableLambda({
  func: async (input) => {
    const { question, k = 5 } = input;

    try {
      // 1. 生成问题向量
      const queryVector = await embeddings.embedQuery(question);

      // 2. 调用 Milvus 搜索
      const searchResult = await milvusClient.search({
        collection_name: COLLECTION_NAME,
        vector: queryVector,
        limit: k,
        metric_type: MetricType.COSINE,
        output_fields: ["id", "book_id", "chapter_num", "index", "content"],
      });

      const results = searchResult.results ?? [];
      const retrievedContent = results.map((item, idx) => ({
        id: item.id,
        book_id: item.book_id,
        chapter_num: item.chapter_num,
        index: item.index ?? idx,
        content: item.content,
        score: item.score,
      }));

      return { question, retrievedContent };
    } catch (error) {
      console.error("检索内容时出错:", error.message);
      return { question, retrievedContent: [] };
    }
  },
});

// PromptTemplate：负责把 context / question 拼成最终 prompt
const promptTemplate = PromptTemplate.fromTemplate(
  `你是一个专业的《天龙八部》小说助手。基于小说内容回答问题，用准确、详细的语言。

请根据以下《天龙八部》小说片段内容回答问题：
{context}

用户问题: {question}

回答要求：
1. 如果片段中有相关信息，请结合小说内容给出详细、准确的回答
2. 可以综合多个片段的内容，提供完整的答案
3. 如果片段中没有相关信息，请如实告知用户
4. 回答要准确，符合小说的情节和人物设定
5. 可以引用原文内容来支持你的回答

AI 助手的回答:`
);

// 构建 context + 日志打印的 Runnable
const buildPromptInput = new RunnableLambda({
  func: async (input) => {
    const { question, retrievedContent } = input;

    if (!retrievedContent.length) {
      return {
        hasContext: false,
        question,
        context: "",
        retrievedContent,
      };
    }

    // 打印检索结果
    console.log("=".repeat(80));
    console.log(`问题: ${question}`);
    console.log("=".repeat(80));
    console.log("\n【检索相关内容】");

    retrievedContent.forEach((item, i) => {
      console.log(`\n[片段 ${i + 1}] 相似度: ${item.score ?? "N/A"}`);
      console.log(`书籍: ${item.book_id}`);
      console.log(`章节: 第 ${item.chapter_num} 章`);
      console.log(`片段索引: ${item.index}`);
      const content = item.content ?? "";
      console.log(
        `内容: ${content.substring(0, 200)}${
          content.length > 200 ? "..." : ""
        }`
      );
    });

    const context = retrievedContent
      .map((item, i) => {
        return `[片段 ${i + 1}]
章节: 第 ${item.chapter_num} 章
内容: ${item.content}`;
      })
      .join("\n\n━━━━━\n\n");

    return {
      hasContext: true,
      question,
      context,
      retrievedContent,
    };
  },
});

// 组合成完整的 RAG Runnable（检索 -> 构建 Prompt 输入 -> PromptTemplate -> LLM -> 文本）
const ragChain = RunnableSequence.from([
  milvusSearch,
  buildPromptInput,
  new RunnableLambda({
    func: async (input) => {
      const { hasContext, question, context } = input;

      if (!hasContext) {
        const fallback =
          "抱歉，我没有找到相关的《天龙八部》内容。请尝试换一个问题。";
        console.log(fallback);
        return { question, context: "", answer: fallback, noContext: true };
      }

      // PromptTemplate 需要 { question, context }
      return { question, context, noContext: false };
    },
  }),
  promptTemplate,
  model,
  new StringOutputParser(), // 这里用 StringOutputParser 把大模型返回结果变为字符串，然后用 stream 流式打印
]);


async function initMilvusCollection() {
  console.log("连接到 Milvus...");
  await milvusClient.connectPromise;
  console.log("✓ 已连接\n");

  try {
    await milvusClient.loadCollection({ collection_name: COLLECTION_NAME });
    console.log("✓ 集合已加载\n");
  } catch (error) {
    if (!error.message.includes("already loaded")) {
      throw error;
    }
    console.log("✓ 集合已处于加载状态\n");
  }
}

async function main() {
  try {
    await initMilvusCollection();

    const input = {
      question: "鸠摩智会什么武功？",
      k: 5,
    };

    console.log("=".repeat(80));
    console.log(`问题: ${input.question}`);
    console.log("=".repeat(80));
    console.log("\n【AI 流式回答】\n");

    // 用 chain 的方式来写有很多好处，可以在每个节点上加一些逻辑，比如重试、传入配置、回调等
    const stream = await ragChain.stream(input);

    for await (const chunk of stream) {
      process.stdout.write(chunk);
    }

    console.log("\n");
  } catch (error) {
    console.error("错误:", error.message);
  }
}

await main();

