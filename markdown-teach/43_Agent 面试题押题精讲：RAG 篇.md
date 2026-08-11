# Agent 面试题押题精讲：RAG 篇

这节开始更一下 Agent 岗的面试题，很多都是学员去面试真实遇到的。

大家可以先自己想一下怎么答，然后看一下思路解析和参考回答。

形成自己的答题思路。

这样面试遇到类似问题就能比较完整流畅的回答了。

这节先集中更 RAG 相关的：

## 说一下 RAG 的流程

RAG 分为两个阶段：

离线知识库构建阶段、在线问答阶段

知识库构建阶段，就是对各种格式的文档做解析、清洗、分块

分块后用嵌入模型生成向量，存入向量数据库，用于语义检索

构建 BM25 倒排索引，存入全文检索数据库，用于关键词检索

在线问答阶段，会对用户问题做 query 改写，换成更适合检索的表达。

然后会做混合检索：

向量检索根据语义匹配相似内容

关键词检索根据具体术语、专有名词去精确匹配内容。

两路检索完成后，之后会做去重、用 RRF 算法对结果做合并排序。

之后用 rerank 重排模型筛选和问题最相关的文档片段

把筛选后的文档片段放入 prompt，交给大模型生成回答。

这就是混合检索 RAG 的流程。

![](https://mmbiz.qpic.cn/mmbiz_png/NMByQQfVwfe7622OUt8A5w525RK1mR8ibKUZEiax6TgcfiaI8vmpn75nsOFU2d5VZKoyf5QT3HQG8hv06ErcFr9zmWLvaf5gwumPh4Yv7ldibss/640?wx_fmt=png&from=appmsg)

上面是参考回答

再额外解释下去重：

多路召回会出现同一个文本块同时被向量检索和 BM25 检索命中的情况，产生重复数据。我们基于 Chunk 唯一 ID 完成去重，但这要求：同一个文本块存入向量库、全文检索库时，绑定相同的 chunk_id。

## 什么是 RRF 算法

向量检索的相似度分数，区间一般 0~1，数值越大语义越匹配。

BM25 关键词检索得分没有固定上限，可能是十几、几十甚至上百。

二者分数取值范围不同。

所以多路召回的两个结果列表不能直接融合

RRF（Reciprocal Rank Fusion） 全称倒数排名融合，

它不看原始分数，只根据文本块在结果列表中的排名计算融合分值。

可以有效融合向量语义检索、BM25 关键词检索两路结果。

之后再从融合后的列表截取前面部分，用 rerank 重排模型做深度语义排序。

![](https://mmbiz.qpic.cn/mmbiz_jpg/NMByQQfVwfdYTloFj0LH6KEEB0Dh4edVHqZ8R4Reh2YyBJ7chk8wB1Z9ND83dPH80pYbuWFxvQEDOB6j7AhgH2uD0xqo9g01S0wTy67ravA/640?wx_fmt=jpeg&from=appmsg)

上面是参考回答

有同学可能会有疑问，后续都会经过 Rerank 模型精排，为什么还需要先用 RRF 做粗融合？

举个例子：

向量召回 100 条、BM25 召回 100 条。

先基于 chunk_id 完成去重，再使用 RRF 重新排序。

从融合后的候选列表截取 Top50，送入 Rerank 重排模型。

我们双路召回的结果会很多，用 RRF 粗融合之后，再从列表里截取一部分来精排。

## 你知道 Graph RAG 么？

Graph RAG 是在向量 + 关键词混合检索 RAG 的基础上，引入知识图谱进行能力增强。

向量检索、BM25 关键词检索仅针对文本块做匹配，缺少实体之间的关联链路，难以推导出分散文档里的间接关联

离线构建阶段，Graph RAG 从文档中抽取实体、关系搭建知识图谱， 同时对文本分片，构建向量索引与 BM25 索引。

在线问答阶段，一方面通过混合检索召回相关文本片段，另一方面提取 Query 内的实体，在图谱中遍历关联链路，找到分散在不同文档里的隐含信息。

把图谱关联信息和检索得到的文本内容整合在一起，交给大模型生成答案，

解决传统混合检索 RAG 只能匹配片段，无法梳理实体关系链条的局限

![](https://mmbiz.qpic.cn/sz_mmbiz_png/NMByQQfVwfchz9AmXzu9qyksxWGdjEWlfn5icVq6VJGibZLEgzI9PDN45vsFcqDISPAibuWOX9vwouicTndRpo4XZV2k8KiaKhdw5oYZ66QNIETI/640?wx_fmt=png&from=appmsg)

## 什么是 Agentic RAG

Agentic RAG 是引入大模型来自主决策怎么检索

把混合检索、知识图谱检索、联网搜索等各类检索能力封装为工具

收到用户提问后，Agent 会理解需求，完成 Query 改写，自主选择调用哪种检索工具

拿到检索结果之后，Agent 会校验现有信息是否能够充分解答问题

如果信息不足，它会优化查询语句，发起新一轮检索，

形成规划、工具调用、结果评估、迭代重试的闭环

直到搜集到充足信息，再整合上下文输出答案。

![](https://mmbiz.qpic.cn/sz_mmbiz_png/NMByQQfVwfcBZ9NKGM0pmIjbDMBImx7wweghVrzb1eYn4yTNrOFwkpRfxs5ArUQvbsjeWQp8qEjV31mgyRy3Q0xY9MF4PlPvQhPaUIjx9XM/640?wx_fmt=png&from=appmsg)

## 你知道父子分块策略么？

父子分块策略，是先将长文档切分为粒度较大的父块，再在父块内部进一步切分出更小的子块。

子块做向量化，存在向量数据库，父块不做向量化，存在其他数据库。

子块通过 parent_id 和对应父块建立关联。

子块负责向量检索，保障召回的精准度；

检索命中子块后，再通过关联关系取出完整父块，把父块作为上下文交给大模型做生成。

本质就是把检索用的分块和生成用的分块进行解耦，子块做检索，父块做生成。

好处是既能发挥小分块检索精准的优势，又解决了子块内容碎片化、上下文不全的问题。

同时规避大分块直接向量化造成的召回噪声，让大模型获取完整连贯的上下文，有效缓解幻觉，提升回答的完整度与准确性。

![](https://mmbiz.qpic.cn/sz_mmbiz_png/NMByQQfVwfdXdJJlibibo1Nop5z0luL0CuUrFNeRW4nOjKemBDicumaNNIaaSQ3FWdXR4CedWS0Pa1y3iczvstX3C0d7lcgWXoicYiacD8ZQCqLYI/640?wx_fmt=png&from=appmsg)

上面是参考回答

这里解释下召回噪声：

长文档直接向量化，会导致召回不够精准，容易把无关的文档召回，这就是召回噪声，它属于检索阶段的概念。

用子块做检索可以缓解这类召回噪声，让检索更精准，定位到真正相关的父块；

之后再取出完整父块上下文交给大模型做生成。

## 如何降低大模型的幻觉？

降低大模型幻觉可以从知识层、提示词层、模型层、校验层 4 个层面处理：

**知识层：**

接入 RAG 检索机制，保障知识库原始数据准确，合理划分 Chunk。

采用向量检索 + 关键词混合检索，兼顾语义匹配与关键词精准匹配。

用 Rerank 重排模型，过滤相关度低的文档片段。

设置相似度阈值，阻止低相似度片段进入上下文。

引入 Agentic RAG 自主评估检索结果，信息不足时迭代补充检索，保障上下文充足可靠。

**提示词层：**

通过 Prompt 强约束模型，仅依据给定上下文生成答案，要求答案标注原文引用。

开启拒答机制，无匹配信息时如实回复，禁止模型编造内容。

**模型层：**

选用事实性、稳定性表现更优的大模型。

面向垂直领域，可使用高质量业务数据进行微调，让模型更倾向依据外部资料作答

**校验层：**

调用大模型对输出结果做二次事实核查，比对原始上下文。

识别出无依据、前后矛盾的内容，进行拦截、修正，减少错误输出。

![](https://mmbiz.qpic.cn/sz_mmbiz_png/NMByQQfVwfeerD3uNfhSoLvn5YkBHycn0liaPJOpc5QphdH0ysPWTdcgvBQrjHfZ8iaCl50wscdicW9sWIjIGb7hxPa5oO9uxGualmrStpAw6Q/640?wx_fmt=png&from=appmsg)

## RAG 如何做权限过滤？

我们项目基于 RBAC 模型做检索权限控制。

文档切片入库时，chunk 会继承父文档的权限配置，将允许访问的角色、是否公开等权限信息作为元数据，同步存入向量数据库与全文检索库。

用户检索时，会先从获取当前用户的角色集合。

基于角色元数据做筛选，只在该用户有权访问的切片范围内执行语义与关键词匹配。

从源头拦截无权限的文档片段，

之后再做 Rerank 重排，选出 Top‑K 相关 chunk 交给大模型生成回答。

![](https://mmbiz.qpic.cn/mmbiz_png/NMByQQfVwfdrOia7XPeguClga71QufWTiat2AdLlBJjj3iahJcUickK4FTkJLHGEu4r2KU5nKq50HQp7o0pAmk3mXExKSbD71YLbeMnUHbQnpdA/640?wx_fmt=png&from=appmsg)

## 如何评估 RAG 的效果

评估 RAG 效果，一般会拆成检索层、生成层两个维度。

首先，首先要搭建一套贴近真实业务的测试数据集，覆盖高频问题、边界 case、易混淆的问题等。

每个问题都要提前标注好标准答案、应该命中的文档以及核心 chunk 片段，作为后续评测的依据。

检索层主要看两点：

一是有效信息能否成功召回

二是召回的有效信息排序是否合理。

对应的量化指标可以用 Recall@K、Hit@K、MRR 等来评估。

生成层也主要看亮点：

一是忠实度，保证回答不瞎编、全部有据可依；

二是答案相关性、完整性，对标标准答案，校验回答是否答得准、答得全。

整体来看，检索层侧重信息的充分召回与合理排序，生成层侧重回答的答案准确、避免幻觉，二者共同构成完整的 RAG 效果评估体系。

![](https://mmbiz.qpic.cn/sz_mmbiz_png/NMByQQfVwfcqV3oGS5GqCsoBeo4BibMF5cOiazm27KaQEXTsBPhkSPqurmpGewFMLcRgoAXliaXjI30E4SAkGuBbAzmAD9iaicQcaRQQsGEogUsM/640?wx_fmt=png&from=appmsg)

上面是参考回答

具体的指标过一下：

检索层指标：

**Recall@K 召回率**

Top‑K 内是否包含需要的文档，衡量找得全不全

示例：

Recall@5=0.8，意味着 80% 的测试样本中，回答问题必需的 chunk 落在检索返回的前 5 条结果内。

**Precision@K 精确率**

Top‑K 里相关文档占比，衡量噪声多少

示例：

返回 5 条结果，只有 2 条真正有用，剩下都是无关内容，精确率就是 0.4

**MRR 衡量正确文档排序位置，越靠前分越高**

示例：

正确内容排在第 2 位，就打 1/2 分，排得越靠前分数越高

**Hit@K 相关文档只要出现在 Top‑K 即命中，只看有无，不看位置**

检索指标小结：Recall 保证不漏掉信息，Precision 减少无效内容，MRR 看排序好不好

**检索层这些指标依赖标注好的标准文档，是可精确计算的客观指标，不依赖大模型打分。**

生成层指标：

**Faithfulness（忠实度）**

校验输出内容是否全部来源于检索上下文，用来识别模型幻觉

示例：

资料写 v2 支持批量导入，AI 说成 v3 支持，忠实度就很差，属于幻觉。

**Answer Relevancy 答案相关性**

回答是否针对用户提问，不跑题、不答非所问

示例：

用户问接口报错原因，模型大段讲业务背景，没有回答报错，相关性差。

**Answer Completeness 答案完整性**

是否覆盖标准答案全部关键要点。

示例：

问题需要返回 3 个配置项，回答只说了 2 个，完整性不足。

**Context Utilization 上下文利用率**

评估模型对检索回来的上下文信息的实际利用程度。

示例：

检索结果已经包含问题解决方案，但模型依旧输出通用套话，没有使用参考信息。

这几个生成层的指标一般都是 LLM as Judge 让大模型来判断打分，也可以人工复核

这些就是 RAG 评估的常用指标。

![](https://mmbiz.qpic.cn/sz_mmbiz_png/NMByQQfVwfeGOKSuReGUtr5Rs7MFCJpIbqMHuJ7lzSorklFrpOcibo9iahnghK34BJJfbMlEP5VgP5413m23wZG70htVQgqr7Bc9gkSWAjXbQ/640?wx_fmt=png&from=appmsg)

## 为什么 Claude Code 不用 RAG  检索代码，而是用 grep？

Claude Code 早期试过本地向量库 + 嵌入模型的 RAG 方案，后来放弃了，改用模型自主调用 grep、glob、read 等工具的 Agentic Search

有几个原因：

**一是因为代码需要的是精确匹配，而不是语义模糊匹配**

自然语言适合向量语义检索；但代码的函数名、类名、变量名、报错字符串本身就是标识符，更适合关键词精确查找

**二是代码库高频变更，RAG 索引很容易过时**

代码库频繁改动，RAG 要持续更新索引，滞后就会拿到已删除、重构的旧代码。

grep 直接读取磁盘实时文件，结果和源码版本完全同步

Claude Code 现在是 Agentic Search，让大模型自主决策检索过程：

决定使用 grep 做内容关键词检索，或是 glob 做文件名匹配

获取候选文件列表后，调用 read 读取目标文件完整内容

如果信息不足，自动调整搜索关键词，循环迭代继续查找

![](https://mmbiz.qpic.cn/sz_mmbiz_png/NMByQQfVwfcEyeUIPoXlknpUG0bZQ64o3pXicn2AVISd9npINsnVsAbbicBerbAp1wXHg8Q7JmicLO9icsPZ3y1wyXKnAl1PhpQddZTODmTT3LU/640?wx_fmt=png&from=appmsg)

## 总结

这节更了 RAG 相关的一些高频面试题。

- 说一下 RAG 的流程
- 什么是 RRF 算法
- 你知道 Graph RAG 么
- 什么是 Agentic RAG
- 你知道父子分块策略么
- 如何降低大模型的幻觉
- RAG 如何做权限过滤
- 如何评估 RAG 的效果
- 为什么 Claude Code 不用 RAG 检索代码，而是用 grep？

看完之后，大家可以试着自己回答一下，如果回答的不流畅再回过头去看一下，然后再自己回答下。

RAG 相关面试题是 Agent 面试必问的，需要重点准备一下。
