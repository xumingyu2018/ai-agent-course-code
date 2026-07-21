import "dotenv/config";
import { RunnableLambda, RunnableSequence } from "@langchain/core/runnables";

// 文本处理链：清洗 → 分词 → 统计
const clean = RunnableLambda.from((text) => {
  return text.trim().replace(/\s+/g, " ");
});

const tokenize = RunnableLambda.from((text) => {
  return text.split(" ");
});

const count = RunnableLambda.from((tokens) => {
  return { tokens, wordCount: tokens.length };
});

const chain = RunnableSequence.from([clean, tokenize, count]);

// 用 callbacks 观测每一步节点 chain 的输出
const callback = {
  handleChainStart(chain) { // handleChainStart 会在每个 chain 节点开始执行时触发
    const step = chain?.id?.[chain.id.length - 1] ?? "unknown";
    console.log(`[START] ${step}`);
  },
  handleChainEnd(output) { // handleChainEnd 会在每个 chain 节点执行结束时触发
    console.log(`[END]   output=${JSON.stringify(output)}\n`);
  },
  handleChainError(err) {
    console.log(`[ERROR] ${err.message}\n`);
  },
};

const result = await chain.invoke("  hello   world   from   langchain  ", {
  callbacks: [callback],
});

console.log("结果:", result);

// withConfig 加入一些配置，chain 的节点可以通过第二个参数拿到
// withRetry 加上重试逻辑
// withFallback 加上备选方案
// callbacks 可以加一些回调函数，比如打印节点的输出