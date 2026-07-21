import 'dotenv/config';
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { PromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";

const model = new ChatOpenAI({
    modelName: process.env.MODEL_NAME,
    apiKey: process.env.OPENAI_API_KEY,
    temperature: 0,
    configuration: {
        baseURL: process.env.OPENAI_BASE_URL,
    },
});

// 定义输出结构 schema
const schema = z.object({
    translation: z.string().describe("翻译后的英文文本"),
    keywords: z.array(z.string()).length(3).describe("3个关键词")
});

const outputParser = StructuredOutputParser.fromZodSchema(schema);

const promptTemplate = PromptTemplate.fromTemplate(
    '将以下文本翻译成英文，然后总结为3个关键词。\n\n文本：{text}\n\n{format_instructions}'
);

const input = { 
    text: 'LangChain 是一个强大的 AI 应用开发框架',
    format_instructions: outputParser.getFormatInstructions()
};

// 步骤 1: 格式化 prompt（用 PromptTemplate 管理 prompt，调用 format 传入占位符的值）
const formattedPrompt = await promptTemplate.format(input);
// 步骤 2: 调用模型
const response = await model.invoke(formattedPrompt);
// 步骤 3: 解析输出（用 StructuredOutputParser 做结构化解析）
const result = await outputParser.invoke(response);
console.log('✅ 最终结果:');
console.log(result);
