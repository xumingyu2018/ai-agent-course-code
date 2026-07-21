import 'dotenv/config';
import { RunnablePick, RunnableSequence } from "@langchain/core/runnables";

const inputData = {
  name: "神光",
  age: 30,
  city: "北京",
  country: "中国",
  email: "shenguang@example.com",
  phone: "+86-13800138000",
};

const chain = RunnableSequence.from([
  (input) => ({
    ...input,
    fullInfo: `${input.name}，${input.age}岁，来自${input.city}`,
  }),
  new RunnablePick(["name", "fullInfo"]), // 从对象里取一些属性，相当于TypeScript里的 Pick<T, K>，只保留指定的属性
]);

const result = await chain.invoke(inputData);
console.log(result);
