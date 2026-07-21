import "dotenv/config";
import { RunnableLambda } from "@langchain/core/runnables";

// 模拟三个"翻译服务"，优先级从高到低

const premiumTranslator = RunnableLambda.from(async (text) => {
  console.log("[Premium] 尝试翻译...");
  // 模拟高级服务不可用
  throw new Error("Premium 服务超时");
});

const standardTranslator = RunnableLambda.from(async (text) => {
  console.log("[Standard] 尝试翻译...");
  // 模拟标准服务也挂了
  // return "xxx";
  throw new Error("Standard 服务限流");
});

const localTranslator = RunnableLambda.from(async (text) => {
  console.log("[Local] 使用本地词典翻译...");
  const dict = { hello: "你好", world: "世界", goodbye: "再见" };
  const words = text.toLowerCase().split(" ");
  return words.map((w) => dict[w] ?? w).join("");
});

// withFallbacks：依次尝试 premium → standard → local，回退备选
const translator = premiumTranslator.withFallbacks({
  fallbacks: [standardTranslator, localTranslator],
});

const result = await translator.invoke("hello world");
console.log("翻译结果:", result);
