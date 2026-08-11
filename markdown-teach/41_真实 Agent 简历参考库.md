# 真实 Agent 简历参考库

很多同学学完 Agent 开发，做完 Agent 项目，但是不知道怎么把它写到简历上。

再就是写完简历也不知道自己写的怎么样，别人都是咋写的，做了啥 Agent 项目。

我特意收集了一些真实的 Agent 简历，供大家参考。

有两个目的：

- 可以参考别人简历咋写的，来写自己的简历
- 看下别人都做了啥 Agent 项目，用了啥技术，有啥功能

![](https://mmbiz.qpic.cn/sz_mmbiz_jpg/NMByQQfVwffTHJl6807gzl0EQr5e1icyTzJ03qHaa5yibMnHzicFdb6ZMtXoEGiaaqnXtWLcynXb60lUbUav0IjscjXzNz3gSG6wibicAucGDYqgY/640?wx_fmt=webp&from=appmsg)

（微信文章现在不能复制了，你可以截图让豆包提取文字，代码部分直接从仓库复制。）

## 第一份

![](https://mmbiz.qpic.cn/mmbiz_jpg/NMByQQfVwfcNmt4pm5qlQaw659ROmg8eA37TxyFuhbTibYTpgHESPib3pswmcYx6ZgWea7OemeE1yKLl4Zxknz1svXRZBmjmVyoQAcIG3CRPA/640?wx_fmt=webp&from=appmsg)

![](https://mmbiz.qpic.cn/sz_mmbiz_jpg/NMByQQfVwfcC6MeOapuQ2QK9MlAw0Ya6r6kQaOk6YRMcMicdJ2o1cu3ZDYgSVzbTOaCAB6ficYauh1x8AaE9Rc5icfjH9tnxcaKZsrZ7GjACvo/640?wx_fmt=webp&from=appmsg)

这个项目是以医学知识图谱为核心的 Agent 问诊系统

用 Neo4j 对医学实体、关联关系结构化建模，让问诊推理不再单纯依赖大模型参数内知识

用 Redis + Mem0 做短期记忆和长期记忆

用视觉大模型做做检验报告的信息提取

如果你也做知识图谱类项目可以参考

## 第二份

![](https://mmbiz.qpic.cn/sz_mmbiz_jpg/NMByQQfVwfdZ0HjltJB5lyVMpMSc3Ds9TmqLW02vrU7qp7mkPgF2pWdyMytfjsf2rS68wbMQtdyMJ2aoVZKcfMCug3eYf6xxEKxBKzlZxMw/640?wx_fmt=webp&from=appmsg)

![](https://mmbiz.qpic.cn/mmbiz_jpg/NMByQQfVwfd5iaoxPvmoTXOUMd7ZljcIsDT42EbSOiaPv1SCjzNsFULca4Mswd7vHCEwdFkVNbOicpltXnkPOcJFIQKbJbYHvK7O0xgBPg1N3g/640?wx_fmt=webp&from=appmsg)

这个是知识库项目

用到了向量 + 关键词的混合检索 RAG，然后 reranker 重排，还用到了 KG 知识图谱检索。

做了权限控制，检索资料的时候会过滤掉没有权限的文档。

写知识库项目的简历可以参考

## 第三份

![](https://mmbiz.qpic.cn/mmbiz_jpg/NMByQQfVwfccETheSf9U7o0XahgKeW0DEZ5qnuicsDHHurqp00rGLAfibcoyXzibzfDvKWr7X368z0dsVV1WgoJpiahP0aW77Q6LKjfP4myicLB0/640?wx_fmt=webp&from=appmsg)

这个意图识别做的比较精细，应该是有一个案例库，然后用向量 + 关键词来检索相关案例，通过 few shot（少量案例）给到 LLM 来做意图识别。

做了 RAG 的查询改写、重排

做了多 Agent 的拆分

重点是这个评测写的不错，前面两个简历都没这点

比如意图识别准确率、端到端回复质量，这些都是可以评测的点

大家写简历也可以加上评测这部分

意图识别如果做的有亮点也可以重点说一下

## 第四份

![](https://mmbiz.qpic.cn/sz_mmbiz_jpg/NMByQQfVwfft0bZOolgI1YyDXVbyic4xy6V4FruXBYSpbumyiaPz4mrG7ASruI5oO7GZcGIUticDdhOEAACibFb8OFIvNE7niaYFguiaDl8ORwOSM/640?wx_fmt=webp&from=appmsg)

这是一个多 Agent 的项目

主 Agent 路由，两个子 Agent 分别做知识问答、订单售后客服

知识库检索也是向量 + 关键词 + 重排

用了 Agentic RAG 的架构，也就是让 LLM 参与检索过程，决定怎么检索，检索的信息是否够，要不要重新检索等

用 LangFuse 来跑评测，LLM as Judge 也就是让大模型评测打分

整体比较完整，但是格式上不如前面几个清晰，如果能高亮、加粗每一条的前面部分会更好

## 第五份

![](https://mmbiz.qpic.cn/sz_mmbiz_jpg/NMByQQfVwfeQiaGPtlCIlxtkhmkruWYhtcI0mBc3wC3dszoy2nIXkl3eBGycAicJseAMZhwQbiaY5cYicKaE86mvRvmoYoxV9yDOFz25CwEj3UA/640?wx_fmt=webp&from=appmsg)

这也是一个知识库项目

向量 + BM25 关键词 + RRF 融合 + Reranker 重排序

也做了 Agentic RAG，就是简历里写的查询改写 -> 向量检索 -> 质量评估 -> 条件重试的自主决策循环

自主决策这个，就是让 LLM 参与检索过程，也就是 Agetic RAG

他还做了大模型的微调，一般这个不是 Agent 开发来做的，了解即可

## 第六份

![](https://mmbiz.qpic.cn/sz_mmbiz_jpg/NMByQQfVwfd9L6OOoSk5ic8u7M1dD179La3zMUd0Pobp2D0ZzfxgyicvOz0kSnY3qHlrrbDjhtgEVia9RCSCOHj8xQJyyJfefs8QhjtmkYKqXI/640?wx_fmt=webp&from=appmsg)

这是一个微调的项目

他这个意图分类比较多，所以专门为微调了一个大模型来做意图识别

一般的意图识别用不到微调，写好 Prompt，用 Few-Shot 加一些参考案例就可以了

大家可以扩展下思路，如果面试问意图识别还可以怎么优化

可以说微调一个专门用来做意图识别的大模型

## 第七份

![](https://mmbiz.qpic.cn/mmbiz_jpg/NMByQQfVwfdd22veZLCoPaG2JiaMRVtrAcmQqChgK2eU1YkdHbbWvLV8WkahFjk5XK4Sk0xqfkolsia80HJ8XLpoibwibmxEBqnaic7lTwAwgwTY/640?wx_fmt=webp&from=appmsg)

这是一个 Text to SQL 的项目

比较有意思的是通过知识图谱 Neo4j 来存储表和表的关联关系

通过向量检索起始表，然后通过知识图谱查询关联表

之后生成 SQL

这个技术方案不错，大家如果做类似的项目可以参考

但他这个简历写的还是太细了，看起来比较累，简历还是简洁清晰一点好，突出重点亮点

## 第八份

![](https://mmbiz.qpic.cn/mmbiz_jpg/NMByQQfVwffg4Oxhcf172Jm27ZHINZW8WD6ZjtaVqhsqTPOl2Xjg1dcosP6QVjn6d841iahpCJlEzIvdm5ExXVZEoJLZuOaeiaaibNia0L4JxS8/640?wx_fmt=webp&from=appmsg)

这是一个生产新闻视频的多 Agent 项目

用 Mem0 做长期记忆

构建了反思循环，也就是 Evaluator 节点校验反馈，之后回到 Generator 节点重新生成

他这个还做了自定义的中间件，还有 skill

如果用了 DeepAgents 框架，自带了 Skill 机制，也可以通过 skill 的方式来封装某些提示词为单独的 skill

中间件、skill 这些，如果项目中用到，也可以写到简历上

## 第九份

![](https://mmbiz.qpic.cn/sz_mmbiz_jpg/NMByQQfVwfdHHia1hgqua89LJcpc72ePstdspaww8ZxD6hgy9osJNkSlTQo5pngNLwJYAojzic01PrFsiajTvlqOJtIwldlo4ib0jmvqsOn6B7c/640?wx_fmt=webp&from=appmsg)

![](https://mmbiz.qpic.cn/sz_mmbiz_jpg/NMByQQfVwfeDvPiaFYmprglV9FuvYdELRQyc2CBVdS7eUGE5NeFQics2NNAbFTOzYAicLIJfN6xlibp2GtPyV23gT6X5TaCkmVaG6P1QQHEibN1I/640?wx_fmt=webp&from=appmsg)

这是一个多 Agent 客服项目

主 Agent 做意图识别

子 Agent 分别做售前、售后、退款、投诉等

有 Human in the Loop 机制，也就是需要人工介入的时候，比如退款审批、工单创建，可以人工来做决定，之后继续流程

这个是 LangGraph 自带的，之前我们写过：

![](https://mmbiz.qpic.cn/mmbiz_jpg/NMByQQfVwfcqT3hhWOkOvXqWqPS2qPgwsIogserqM1P7fZq2aGVSzHzT6cQSGYO0CKmrOwFKuiaFg8fVXicefSIe3Aiam5BSjyNFNUoJ5L7laE/640?wx_fmt=webp&from=appmsg)

![](https://mmbiz.qpic.cn/mmbiz_jpg/NMByQQfVwfeAqY7w3rKf7YJ33Pql28qrOQVIA6SNRYacHtJ1SoGOOBLbiaOyR7YErgCgzDWy28KvVdlKdPjjnfG5AuIrmySd7bibuHnOicfZaQ/640?wx_fmt=webp&from=appmsg)

在 LangGraph 的节点里用 interrupt 就会中断

然后当人工介入完成，用 resume 的 Command 再次调用 graph 就可以继续流程：

![](https://mmbiz.qpic.cn/mmbiz_jpg/NMByQQfVwfdicUDXtfJzibsYCVAHdmwm7Ja1rEOS6IFZo8FH3qvBuFFoHQshVLrZx67zdSia5g4hw6mArf7Dd9sMF6Q7k9jhLd9yJQDQeID3bU/640?wx_fmt=webp&from=appmsg)

需要人工介入的地方都是这样做。

这个叫做 Human in the Loop

他是通过把订单系统、CRM、工单系统等封装为 tool call，来整合其他业务系统的，一般都这样。

短期记忆也是 Redis + 摘要压缩，和我们前面实现过的一样

这里的 Workflow 可能有的同学没概念

Workflow = 人提前定义好固定步骤；

Agent = LLM 自主动态决定下一步做什么。

![](https://mmbiz.qpic.cn/sz_mmbiz_jpg/NMByQQfVwfcPcjj0obiafpLUmLcUMWxssV1biaxKe9aicvibjHkFBLUug2a6CePyLjdIY1beDRX9KlJlHibdZHUibl8304slKxIlLJvHtETKLUAbc/640?wx_fmt=webp&from=appmsg)

## 第十份

![](https://mmbiz.qpic.cn/mmbiz_jpg/NMByQQfVwfffd3W2xGYX7l7u6Hu7zDZTXKwUUVS66JslnlmUZviamBDyDcHtcibrhfhgAQydLoHm4gibibReX8MQeHW45e7ZJ9bhv0LS0uce74A/640?wx_fmt=webp&from=appmsg)

这个也是知识库项目，但是支持跨模态检索，也就是 Any2Any

他这个跨模态是用多模态嵌入模型把文本、图片都存到了同一个向量空间来实现的

不是那种图片识别转文字，然后做文字的语义检索那种

知识检索也是用了向量 + 关键词的混合检索

用 Redis 做短期记忆，Milvus 做长期记忆，关键词 + 语义混合召回长期记忆

做了 Agent 的评测，比如召回率、准确率等指标

## 总结

我们看了 10 份真实的 Agent 项目简历，包括医疗问诊、工业 RAG 知识库、财税意图微调、Text‑to‑SQL、多智能体协作、多模态检索、智能客服等项目

大家可以看一下这些项目的业务场景，为啥做这个 Agent

用到了那些技术，流程是啥样的

比如有的复杂的意图识别专门微调了大模型，再就是用知识图谱存表的关联关系做 Text To SQL，这些可以扩展思路

但重点还是放在知识库相关项目上，这个是简历常见项目，但也很加分

比如向量 + 关键词 + Rerank 的混合检索，Neo4j 知识图谱来做推理式检索

比如大模型自主决策检索过程的 Agentic RAG

Redis 短期记忆、Mem0 长期记忆

基于 LangFuse 的评测系统都有哪些指标

两个目的，一个是参考别人的简历写自己的简历，另一个是看做了啥 Agent 项目，都是啥样的技术方案。

看完这些，相比你对 Agent 的学习方向也就更清晰了。
