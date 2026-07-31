import "dotenv/config";
import { BaseDocumentCompressor } from "@langchain/core/retrievers/document_compressors";

// langchain 提供了 rerank 重排模型的基类 BaseDocumentCompressor，但是没有 qwen 重排模型对应的封装，需要自己封装下
export class DashScopeRerank extends BaseDocumentCompressor {

  // 封装 qwen 重排模型的构造函数
  constructor({ apiKey, model = "qwen3-rerank", topN = 3, baseUrl } = {}) {
    super();
    this.apiKey = apiKey;
    this.model = model;
    this.topN = topN;
    this.baseUrl = baseUrl ?? process.env.RERANK_URL;
  }

  // fetch 发送请求到 DashScope 的重排模型接口，返回重排后的文档列表，参考以下 curl 命令
  // curl --location 'https://ws-5c8vula3bbimk1xz.cn-beijing.maas.aliyuncs.com/api/v1/services/rerank/text-rerank/text-rerank' \
  // --header "Authorization: Bearer $DASHSCOPE_API_KEY" \
  // --header 'Content-Type: application/json' \
  // --data '{
  //     "model": "qwen3-rerank",
  //     "input": {
  //         "query": "什么是文本排序模型",
  //         "documents": [
  //             "文本排序模型广泛用于搜索引擎和推荐系统中，它们根据文本相关性对候选文本进行排序",
  //             "量子计算是计算科学的一个前沿领域",
  //             "预训练语言模型的发展给文本排序模型带来了新的进展"
  //         ]
  //     },
  //     "parameters": {
  //         "return_documents": true,
  //         "top_n": 5
  //     }
  // }'
  async compressDocuments(documents, query, _callbacks) {
    const res = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        input: {
          query,
          documents: documents.map((d) => d.pageContent),
        },
        parameters: {
          return_documents: false, // 只返回重排后的文档索引，不返回文档内容
          top_n: this.topN,
        },
      }),
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(
        `DashScope rerank ${res.status}: ${JSON.stringify(json)}`,
      );
    }

    const results = json?.output?.results;
    if (!Array.isArray(results)) {
      throw new Error(`unexpected rerank response: ${JSON.stringify(json)}`);
    }

    return results.map((item) => documents[item.index]);
  }
}
