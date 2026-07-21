import 'dotenv/config';
import { RouterRunnable, RunnableLambda } from "@langchain/core/runnables";

// 创建两个简单的 RunnableLambda
// RunnableLambda 是一个可以将普通函数包装为可运行对象的类
const toUpperCase = RunnableLambda.from((text) => text.toUpperCase());
const reverseText = RunnableLambda.from((text) => text.split("").reverse().join(""));

// 创建 RouterRunnable，根据 key 选择要调用的 runnable，相当于 switch case
const router = new RouterRunnable({
  runnables: {
    toUpperCase,
    reverseText,
  },
});

// 测试：调用 reverseText
const result1 = await router.invoke({ key: "reverseText", input: "Hello World" });
console.log('reverseText 结果:', result1);

// 测试：调用 toUpperCase
const result2 = await router.invoke({ key: "toUpperCase", input: "Hello World" });
console.log('toUpperCase 结果:', result2);
