import "dotenv/config";
import { RunnableLambda } from "@langchain/core/runnables";

let attempt = 0;

// 一个会随机失败的 Runnable，用来演示 withRetry 重试
const unstableRunnable = RunnableLambda.from(async (input) => {
  attempt += 1;
  console.log(`第 ${attempt} 次尝试，输入: ${input}`);

  // 模拟 70% 概率失败的情况
  if (Math.random() < 0.7) {
    console.log("本次尝试失败，抛出错误。");
    throw new Error("模拟的随机错误");
  }

  console.log("本次尝试成功。");
  return `成功处理: ${input}`;
});

// 使用 withRetry 为 runnable 加上重试逻辑
const runnableWithRetry = unstableRunnable.withRetry({
  // 总共最多 5 次尝试
  stopAfterAttempt: 5
});

try {
  const result = await runnableWithRetry.invoke("演示 withRetry");
  console.log("✅ 最终结果:", result);
} catch (err) {
  console.error("❌ 重试多次后仍然失败:", err?.message ?? err);
}

