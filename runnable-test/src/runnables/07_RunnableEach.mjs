import 'dotenv/config';
import { RunnableEach, RunnableLambda, RunnableSequence } from "@langchain/core/runnables";

// RunnableEach 是一个特殊的 Runnable，它可以对数组中的每个元素应用一个 Runnable 链，并返回处理后的结果数组。
// 对输入的数组的每个元素应用这个 chain，相当于在数组上做了一个 map 操作。
const toUpperCase = RunnableLambda.from((input) => input.toUpperCase());
const addGreeting = RunnableLambda.from((input) => `你好，${input}！`);

const processItem = RunnableSequence.from([
  toUpperCase,
  addGreeting,
]);

// 使用 RunnableEach 对数组中的每个元素应用这个链
const chain = new RunnableEach({
  bound: processItem,
});

const input = ["alice", "bob", "carol"];
const result = await chain.invoke(input);

console.log('✅ RunnableEach - 数组元素处理:');
console.log('输入:', input);
console.log('输出:', result);
