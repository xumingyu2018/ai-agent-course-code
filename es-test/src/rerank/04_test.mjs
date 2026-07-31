import "dotenv/config";
import { Document } from "@langchain/core/documents";
import { DashScopeRerank } from "./03_dashscope-rerank.mjs";

async function main() {
    const apiKey = process.env.OPENAI_API_KEY;

    // 创建 DashScopeRerank 实例，这个实例可以用来对文档列表进行重排
    const compressor = new DashScopeRerank({ apiKey, topN: 3 });

    const query = "什么是文本排序模型";
    const docs = [
        new Document({
            pageContent:
                "预训练语言模型的发展给文本排序模型带来了新的进展",
        }),
        new Document({
            pageContent: "量子计算是计算科学的一个前沿领域",
        }),
        new Document({
            pageContent: "文本排序模型广泛用于搜索引擎和推荐系统中…",
        }),
    ];

    // 调用 compressor.compressDocuments 方法对文档列表进行重排，返回重排后的文档列表，第一个参数是文档列表，第二个参数是查询语句
    const ranked = await compressor.compressDocuments(docs, query);
    console.log("重排后顺序（pageContent）：");
    for (const d of ranked) {
        console.log("-", d.pageContent);
    }
}

main()
  