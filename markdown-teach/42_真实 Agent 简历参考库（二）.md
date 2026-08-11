# 真实 Agent 简历参考库（二）

这节继续分享 10 份 Agent 方向简历。

看得简历多了你会发现，大家用到的技术栈高度趋同，很容易就能找准学习重点 😏

像意图识别、RAG 混合检索、知识图谱、多 Agent 协作、记忆管理这类核心模块，多看几份简历，就能摸清主流的 Agent 实现方式。

![](https://mmbiz.qpic.cn/sz_mmbiz_jpg/NMByQQfVwffDiblrYTZhlfQ6W0QFmiaq4DsEUdxMsgAvANdbUeXIYZf6ttgoYicg8odcyCN21mia71h66ak64gX8XzA9UxVUlpvwLCrFr7Gp3sY/640?wx_fmt=webp&from=appmsg)

后面也会列一下个人技能部分，供大家参考

## 第一份

![](https://mmbiz.qpic.cn/mmbiz_jpg/NMByQQfVwfdxJlNQGmSkc5CSQFFPydQ2dQ8frWChVY91Owy0H5M9DRsIDo7cwJYOVtwMRdRZsChVSkoIfUpR3NialeQ3KqQhSQ1qjcQTaYD8/640?wx_fmt=webp&from=appmsg)

![](https://mmbiz.qpic.cn/mmbiz_jpg/NMByQQfVwfcanlWBpquTHBrRYnQKe05ezTZTVRBibanFpfaIKXlqZ3LHHO7eaFSNEUGXRmbrp3AID0ibtRIUq7asyRcPu5EDFWgs7Pf6BMvick/640?wx_fmt=webp&from=appmsg)

这个客服 Agent 如果是售后 FAQ、退换货政策咨询、会员权益查询这些走 AI，复杂问题自动创建工单转人工

ReAct 模式，意图识别 -> 任务拆解 -> 工具调用 -> 结果整合 -> 回复生成这样的 pipeline

![](https://mmbiz.qpic.cn/mmbiz_jpg/NMByQQfVwfeoibibbehosZKYXujAIef2ov26AXov2cfcdyI1DdUIEx10mKic62Bg8EIsMLBKzoZ6TfLAY2FCRpy1gkpUqqEoiabibxdFcddIqyNY/640?wx_fmt=webp&from=appmsg)

把订单、物流、会员的查询，以及工单创建，封装为 tool call

这样 Agent 就可以自己获取这些信息，以及创建工单了

当然，创建完的工单需要人工审批。

![](https://mmbiz.qpic.cn/sz_mmbiz_png/NMByQQfVwffOCL6rLyQCU4OmQXN74jv0pFZVHz8ZvngSr6LHfibwKMbwrSM3ibGQtPsStz3WEXrBXR0BD6OvEgZnIHVlqIXVJQ7LxHNs5nQK4/640?wx_fmt=png&from=appmsg)

他把产品 FAQ、退换货政策、食品安全规范，这些放到了向量数据库来检索。

但是 FAQ 用向量匹配问题，如果匹配到了，直接输出标准答案，不让 AI 生成

其余的走 RAG 的混合检索和 AI 生成流程。

在主 Agent 做了意图识别，分到投诉反馈、政策咨询等链路，如果大模型判断没解决，就会自动转人工

他这个项目成果这里大家也可以参考

智能客服 Agent 是常见的项目，大家做类似项目，可以参考这个

## 第二份

![](https://mmbiz.qpic.cn/sz_mmbiz_jpg/NMByQQfVwff3GtFPSCCrvb7kmibGn3yyw3LopwJoDdueRczzY301nkUmoGarDIiaOssEPDwpNBRRG6TyelJkb7UBxmP4jmibDkUSke2fOV3zrI/640?wx_fmt=webp&from=appmsg)

![](https://mmbiz.qpic.cn/mmbiz_jpg/NMByQQfVwfehVnydzHH24ZibkwWiaWZYJFh0xdHJibp1F1YOGj9CtzN6tE8xPIBfianQMvAsYgicj7UnmMXLZMKYpTGiba5MDibU6euHhkWVN42ibHk/640?wx_fmt=webp&from=appmsg)

之前分享过一个 text2sql 的，这类需求其实挺多，

运营、销售、产品团队日常查数据的需求，让业务人员用自然语言查业务数据

其实应该叫 nl2sql，自然语言到 sql

![预览](https://mmbiz.qpic.cn/sz_mmbiz_png/NMByQQfVwfeYIRicuibznibjibeiakQNBReXdSFrbFFica8YzzHlSXUnTLlrg2qFbb9Zl5dNKGXMASdW43ox96F8tFzeVhjWAtraYECe5pOsc75Xs/640?wx_fmt=png&from=appmsg)

他这个不完全是 LLM 生成 sql，你看第一条，大部分还是拼接 sql，少部分走 AI 生成

知识库里存放表、字段的信息，用关键词 + 向量来混合检索

用 LangGraph 做的多 Agent，有意图识别 Agent （就是主 Agent）、数据分析 Agent（NL2SQL 的那个）、闲聊 Agent（其他聊天）

用 sqlparse 分析 sql，判断操作是不是在白名单里、表是不是白名单里等，做一下预检

Prompt Template 大家都说 API 多，如果要管理复杂的 Prompt 模板就需要了，你看第 6 条

它这个会按照 系统角色、规则约束、动态Schema、Few-shot样例、用户问题 来拼接 Prompt，模板拆分管理，用的时候拼接

NL2SQL 也是常见 Agent，但是大家了解就行，简历还是写知识库这种比较好聊的 Agent 更好

## 第三份

![](https://mmbiz.qpic.cn/mmbiz_jpg/NMByQQfVwffTcHfHphfFPwMfDm2bDd8BktFGkp7uFdP0NV9WiawOXlWWja8DUE2xat5FL0CmLsrE9qtnJwcTUe8VOCh3v8ZsJ8iaTOMDf54n4/640?wx_fmt=webp&from=appmsg)

再来一个知识库项目的

也是向量 + 关键词混合检索，这是标配了

父子分块，也就是按照大章节拆分父块，然后章节内部再分小的子块

子块通过元数据关联章节的父块

子块做向量化，携带父块元数据，存入 Milvus

这就是父子双层分块

用户的问题检索出相应的子块，可以通过父块 id 检索 PostgreSQL 里的父块原文

![](https://mmbiz.qpic.cn/mmbiz_png/NMByQQfVwfdcfLZBggwB8lvsOOTn5GG0XzQ7rOAqCJAmMDndMW48e3yoUwWhDia3EHPQjJCOPEYibeAraPX0icCzOpjeg15Gkq3oiaM8AdvjoQs/640?wx_fmt=png&from=appmsg)

然后这个也是微调了一个大模型来做意图识别，上节也见过一次

一般直接用 LLM + Few-Shot 少量案例，做意图识别就足够了，复杂一点可以微调模型来做

## 第四份

![](https://mmbiz.qpic.cn/mmbiz_jpg/NMByQQfVwfdRIxxsj8cy4Ik9BXNXdF7aVTDIgMwF5QeNCNglUibvLH3vj7aBW7svq76EPoqMiazyz0UYxp8Y45Vf5QEOBJhEEYhfE1zRuHrJw/640?wx_fmt=webp&from=appmsg)

这也是知识库项目

自纠正迭代流程，其实就是 Agentic RAG

让大模型参与检索过程，自主决策怎么检索，都是 Agentic RAG

也是关键词 + 向量混合检索

他这个查询改写部分重点说了一下

一个是口语化的表达改成专业表达

再就是会补充缺失的信息维度

之后再检索

整体来说感觉写的一般，但是他这个查询改写部分写的比较细致，可以参考

## 第五份

![](https://mmbiz.qpic.cn/mmbiz_jpg/NMByQQfVwfeBiaXJIrNeVmqpcZcicIc2vEcffy7ctadd4Y4hRYFJPxQZgOkWxRXSXzH2IaiajPHF6JUxOmvYPdWDaWUlLGu8eiaVDGcl4cuZw6Y/640?wx_fmt=webp&from=appmsg)

再来一个知识库项目，儿科疾病多模态知识库

他这个是语义 + 关键词 + 知识图谱的混合检索，算是 GraphRAG

文本、图片用多模态嵌入模型统一映射为向量来做图文跨模态检索

![](https://mmbiz.qpic.cn/sz_mmbiz_jpg/NMByQQfVwfdic2ZY0elj0lzZEmb0Jy7quHrIcicTOsWybmcf9JL07ua9uAOPk9JDu96k6KlhzDiawAFxzoCJv2YfVVLbicIxMSyh4A3vHYsBcYw/640?wx_fmt=webp&from=appmsg)

直接用多模态嵌入模型做向量化，可以图搜图

而如果是图片 OCR 提取文字，再走文本检索，会丢失图片的一些布局信息，只是根据文本来检索

那如果图片里没有文字呢？

![](https://mmbiz.qpic.cn/mmbiz_jpg/NMByQQfVwfdyTJVwYqbDyI7cibYvTxgyFNDZd4riaYhXzibRysvUNNA6Js7f7muO8atibzE8J4YWQJrXwyicGpqy5CRrVaXUGKreMHVNPxXYv5w4/640?wx_fmt=webp&from=appmsg)

所以直接用多模态嵌入模型来做会更靠谱一些：

![](https://mmbiz.qpic.cn/sz_mmbiz_jpg/NMByQQfVwfeTUY08txgQauwClibkLI4VClhHScyyWczlNE76Ld3ianPAnSzXsODj19lLXU5vwCXtqoa0qXuzdzG7LloHWqzvVqboaGptCf5oE/640?wx_fmt=webp&from=appmsg)

比如阿里的这个，支持图片、视频、文本的向量化：

![](https://mmbiz.qpic.cn/sz_mmbiz_jpg/NMByQQfVwfcgr8icqPzFtbrShQOSuZAnnoicOzVyxvOQvKexL6lTko7JCRPXiaHUwldezichYKyDOf4fFKdvIOt3030npQTttQvwCttSDj1VuTQ/640?wx_fmt=webp&from=appmsg)

天然支持图搜图、文搜图、视频搜视频等跨模态检索

说会整体，他这个项目就是混合检索 + 知识图谱的架构：

![](https://mmbiz.qpic.cn/mmbiz_png/NMByQQfVwfdIg4gnw0wDIVm4Xp5yfChPY6bDSjZaV28Ub9wRsDuOgibibKbO6PycFgD2NFic9xRrnJG6hC8Z5reqPjRt77XCdeiaARXsh8dTy8c/640?wx_fmt=png&from=appmsg)

然后他短期记忆是也是用滑动窗口 + 摘要，长期记忆是语义 + 全文检索

记忆基本都这么搞

也做了 RAG 评估体系

这个项目整体来说挺不错，如果你也做跨模态检索、知识图谱推理、混合检索的知识库，也可以参考

## 第六份

![](https://mmbiz.qpic.cn/mmbiz_jpg/NMByQQfVwfemESuolmnm6zKh1BfjfdawibJ0ibtZLL5mgicurhQIXQ9ERM0a5Z86iaONHiasgTr0vjnRLtonU63RCVxRadl3vA8HUX0HZS88LlT8/640?wx_fmt=webp&from=appmsg)

这个也是知识库

切分的时候也是用了父子分块机制

关键词 + 向量混合检索

通用搜索用 MCP 来接入，包括百度地图的导航链接生成也是用 MCP

## 第七节

![](https://mmbiz.qpic.cn/mmbiz_jpg/NMByQQfVwfceXZribD5c6lehte4gCAaiaASBmpoozKVNeZ2PAk8qHwn5UKKB2CLGB7weA4O4IZuJ7ryVDmj1ZCXduqYZxQibEPNic4SzKI0hmzo/640?wx_fmt=webp&from=appmsg)

这个知识库项目会统一把各种格式的文件解析为 markdown 格式

携带原文章节、路径、页码，权限信息

这样检索出来可以定位到原文，也可以根据权限过滤

![](https://mmbiz.qpic.cn/sz_mmbiz_jpg/NMByQQfVwfeo4skBXtfGPibWYsBNnlonwibRcRgU41R23IL5aZiaZkT0aBho6CRtaqd28bkXxFDBUZiayWb2ibuzm9BoNTRCqdicb9aDYT0QxrPl8/640?wx_fmt=webp&from=appmsg)

然后切分策略也是父子分块

用了多模态嵌入模型来把图文转向量，可以做跨模态检索

（这种见到好多次了，做跨模态检索用多模态嵌入模型算是最佳实践了)

然后也做了查询改写、RAG 质量评估这些，写的比较完整

## 第八份

![](https://mmbiz.qpic.cn/mmbiz_jpg/NMByQQfVwfd6qyXL5ujRTR5Yj1L8PIfTZR2HibteAjKwvFFyF7fgy0aBZ0gsVJayicWxnCkUCn6fFU5c9kVXKBTDxpDbn8MKYWYfJkajdPzKI/640?wx_fmt=webp&from=appmsg)

![](https://mmbiz.qpic.cn/mmbiz_jpg/NMByQQfVwfex5vq5UEzeC1A7LTqjOKKOtXTntNN10QRgGTtaum4iaoka6XibCSRrKxdGVzoCIE0XqEaXn6oRy5dTe7oWYolbNGSEibibib5rvtqc/640?wx_fmt=webp&from=appmsg)

这是一个数字人项目，但核心还是 Agent，也就是 RAG 这部分

实现了 Agentic RAG，也就是有问题改写、评估、重新检索这些

短期记忆放 Redis、长期记忆用 Mem0

向量语义 + 关键词全文的混合检索，用 reranker 模型重排

用 LangSmith 做研发时的调试，LangFuse 做线上监控

数字人只是表现形式，核心还是 Agent 那些技术

## 第九份

![](https://mmbiz.qpic.cn/sz_mmbiz_jpg/NMByQQfVwfep6ibzYWicFacPniajibYDhFN3PgxeiaRPvnbSbnxwb4eNpBvtlHoo64WYVlHFiaefITqLJYHDKhszUW06licHLv8qHLOgGlOd7eDRy8/640?wx_fmt=webp&from=appmsg)

Agent 和已有业务的整合，基本都是把其他业务封装成 tool 来调用

所以所有公司的业务都可以做 Agent

也是多 Agent，主 Agent 做意图识别和任务拆分，子 Agent 完成具体业务

## 第十份

![](https://mmbiz.qpic.cn/mmbiz_jpg/NMByQQfVwffxltYiaq7Fjh5sIcvM4MUKx8BW1vOEZYZoVrPO2n8V2nLBsc7mdg6rQ5GA3bviaOjuXZRic1ibPw4nTEoxvZLEOpjZny3q2LjzibgE/640?wx_fmt=webp&from=appmsg)

![](https://mmbiz.qpic.cn/sz_mmbiz_jpg/NMByQQfVwfeicjwT1iaia0YXtTiasgkZFY2cKgIxKDmkTbFV0ALR6pstpB7lP8hR3ACSIz6TEvTiaybpbj2doc1jqU7jibqFdSZYC21ENGa9v2Z0I/640?wx_fmt=webp&from=appmsg)

这是一个养老护理文档的知识库系统。

这个也是用了父子分块，先按照章节拆分大块

内部再切分小块，子块关联父块

图片用 OCR 识别转文本放到文档块中

他这个写的比较细致，还写了块 200-800 字，重叠 50 字

也是向量 + 关键词混合检索

## 个人技能

Agent 项目的简历我们看了很多了，接下来看一些个人技能部分都怎么写，大家可以参考

这些简历有的是算法工程师、有的是大数据工程师，只关注 Agent 部分就好了

现在 Agent 开发岗确实各种背景的都有，有全栈、有算法

![](https://mmbiz.qpic.cn/sz_mmbiz_jpg/NMByQQfVwfcuH7EsZ0UMNibtLhTeF1ficfTdlTuYCjhtyvIPicuHZaXtCXWpjmETmGDXIhafdfYTsOWf3so46Ydrd4GgLOCI46h4fe9bNics8A0/640?wx_fmt=webp&from=appmsg)

![](https://mmbiz.qpic.cn/mmbiz_jpg/NMByQQfVwfeVsKhPtjjrVUrgInqIib4ibSrBZGqdTxBTOWKLlCwgDibQovHCXwrPjPgyFV2YYAx9ibTwqYkRlP20W6LaiatQeYWIzHwRXJztnddI/640?wx_fmt=webp&from=appmsg)

![](https://mmbiz.qpic.cn/sz_mmbiz_jpg/NMByQQfVwfem1w6sm82siaPpyrTy09V7Z0mJ2iaoZIQPuCATs94z7ecZKkb5eDsSI0sSKkI7GRNRyicPyBmI6EVVEZEIbkt1FDcF3FNPuCM2qs/640?wx_fmt=webp&from=appmsg)

![](https://mmbiz.qpic.cn/sz_mmbiz_jpg/NMByQQfVwff3qhGduvYXR2C9shPhZ4miadUQ5KpwhNKCZ4IibvBB5uUvT4vNET4QhwFxv8H6nnvm4nor3N2PTMaM0MzbTjcG357lAanqvcCJA/640?wx_fmt=webp&from=appmsg)

![](https://mmbiz.qpic.cn/sz_mmbiz_jpg/NMByQQfVwfeKMf7Bgckqk9icnRu1PurZlAneiaJo4MndXeNAUNWee6EavySKia4opTMp7pVyxxUfMUJI70SyM11ydS0ALgWdEUvEScLsQ5BiarM/640?wx_fmt=webp&from=appmsg)

![](https://mmbiz.qpic.cn/mmbiz_jpg/NMByQQfVwfftL4TklDBWC6s25HmYMR6EiasqZSUCRLl3Ctt6yfY1rynPyY62VsYjmkGQHFQIxictdsuSlmsdnvqgdn7tw0fhricVF1iaiaibfsibeI/640?wx_fmt=webp&from=appmsg)

![](https://mmbiz.qpic.cn/mmbiz_jpg/NMByQQfVwffXYRibuclznXtz5xfpRUISA1TUorL4WSG23le5OckyicXldMCpiath7RNichNGWyNLAvsE81IR00aZH7vWcrE84QFtyAApvnkuejw/640?wx_fmt=webp&from=appmsg)

这部分参考价值也不大，每个人背景都不一样，大家只看其中 Agent 部分就好。

## 总结

我们又看了一些 Agent 的简历，包括项目经历、个人技能。

看的多了，你会发现各种 Agent 技术方案都差不多，那你也就自然知道了学习的重点，以及简历该怎么写。

比如想做 any2any 的跨模态检索，好几份简历提到了用多模态嵌入模型来做。

比如文档拆分，很多份简历都提到了父子分块策略。

比如多 Agent 都是主 Agent 做意图识别、子 Agent 做具体的业务

比如和已有业务结合，都是把其他业务封装为 tool

比如所有知识库都是向量 + 关键词混合检索，然后 rerank 重排，部分会再结合知识图谱来做 GraphRAG

比如都做了 LangFuse 评测系统，关注的指标也都是准确率、召回率这些

比如都是 Agentic RAG，也就是大模型参与问题改写、评估、重新检索这些，很多都提到了自主迭代循环。

RAG 基本是面试必问的，项目也大多是知识库项目，这代表着企业的需求其实也大部分是让你做这类 Agent 开发。

也有 NL2SQL 的给业务做的自然语言查询数据的 Agent

看的简历多了，你就大概知道如果你入职了 Agent 工程师，都会做啥项目，用啥技术方案了。

对于你学习 Agent 开发是辅助作用。

而且你写简历的时候，也可以以这些简历做下参考，取其精华，写的清晰、有亮点一些。
