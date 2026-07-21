import 'dotenv/config';
import { RunnablePassthrough, RunnableLambda, RunnableSequence, RunnableMap } from "@langchain/core/runnables";

// 如果是想保留原始属性，只是扩展一些属性，像 Object.assign 一样，用 RunnablePassthrough.assign
const chain1 = RunnableSequence.from([
    RunnableLambda.from((input) => ({ concept: input })), // 用 RunnableLambda 对输入做了转换
    RunnableMap.from({ // 用 RunnableMap 并行处理
        original: new RunnablePassthrough(),
        processed: RunnableLambda.from((obj) => ({
            concept: input,
            upper: obj.concept.toUpperCase(),
            length: obj.concept.length,
        }))
    })
]);

// 代码简化，只保留函数、对象即可，LangChain 会把函数转为 RunnableLambda，把对象转为 RunnableMap
const chain = RunnableSequence.from([
    (input) => ({ concept: input }),
    RunnablePassthrough.assign({
        original: new RunnablePassthrough(),
        processed: (obj) => ({
            concept: input,
            upper: obj.concept.toUpperCase(),
            length: obj.concept.length,
        })
    })
]);


const input = "aaa";
const result = await chain.invoke(input);
console.log(result);
