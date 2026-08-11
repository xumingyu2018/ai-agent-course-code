# 企业级知识库项目：项目介绍、多模态 RAG 流程梳理

AI 时代，知识库已经是非常普遍的内部基建项目了。

员工日常工作中积累了大量的业务资料、操作经验、问题解决方案和流程规范。

但这些宝贵的知识资产，大多是零散保存、分散在各处的，没有统一归集。

传统资料查找效率极低，单纯手动翻找文档、或者关键词检索都十分局限，遇到问题只能反复问人、反复试错，耽误工作进度。

搭载 AI 能力的知识库，支持语义检索、AI 一键问答，看懂需求就能匹配对应资料、直接给出解决方案。

极大缩短查询和答疑时间，彻底解决传统查资料繁琐低效的问题，全方位提升工作效率。

所以，搭建统一的企业知识库，是非常有必要的基础建设。

![](https://mmbiz.qpic.cn/sz_mmbiz_png/NMByQQfVwfcnACkialticneG130qEB2yQhqHsh7lvKrOK44Ht5FKPQPtQMUNJx4KCiaVbcvWSMPcSSTJZuw7csdJicmyePiaYLjiaOkia2diaqBAS2Q/640?wx_fmt=png&from=appmsg)

大概画了一下原型图：

![](https://mmbiz.qpic.cn/sz_mmbiz_png/NMByQQfVwfeVem2C7QaJutwOBduibL3IyFfLP2LMrIzVB880sCxibiaXspCglcJ1cRiaMsw5lzY3XYa5kibBAr1H9steGIEgLm1JoGFZ0uht9nxQ/640?wx_fmt=png&from=appmsg)

![](https://mmbiz.qpic.cn/mmbiz_png/NMByQQfVwfegwYvxPLiceboxzYJlDkKZL61Jc2kwe51QduflVm1oGnbcsfz8KrjUW7d57PuDMVkGYicn1swStSfhg1zic2Manx5LDWHtjjGcoQ/640?wx_fmt=png&from=appmsg)

![](https://mmbiz.qpic.cn/sz_mmbiz_png/NMByQQfVwfdRJcUa8JZicjicLXhSM2hN5vtUltYYqiblw3kqOqqOyoajaH0ib8icDG9jRpHc9npCpHczPZpvN2jxMjmdboHL8sgjuUbYaUksCUS4/640?wx_fmt=png&from=appmsg)

![](https://mmbiz.qpic.cn/mmbiz_png/NMByQQfVwfeRcxLXhnRTmaUXW3fYwTxhBVET9wSUlphGr3rYxCZ6erfnBfPCsib913utDCwq0uDrwfYSutjUEhNeAO0br61BtxW4E5ZvatTg/640?wx_fmt=png&from=appmsg)

![](https://mmbiz.qpic.cn/sz_mmbiz_png/NMByQQfVwfe0KpeHcZd66szNJLHxcvOdoBKE9eqobuRPLyGk49ofulGsZlmEE65s67Qjdp8PpbNttzGG7LHf40wiboCjT8WQN58GfX5VhUWI/640?wx_fmt=png&from=appmsg)

![](https://mmbiz.qpic.cn/sz_mmbiz_png/NMByQQfVwffvbWbPdia1WHWRmy0PHic16JNwPlQA1JnT4nnvjydn1v9gcr3Gf730LribMztgjanE9kxyBCA6663uEicPNwdMSHl3EQIX6iaGY85I/640?wx_fmt=png&from=appmsg)

核心是文档管理、AI 问答、知识图谱这些。

文档会做权限管理，只有有权限的文档可以检索出来用来生成回答。

![](https://mmbiz.qpic.cn/mmbiz_png/NMByQQfVwfdRGKiaTCicFcicmibwgB7728wUwI3Zvp3icY4s0JdmLqAibtzSS3ia92t51CpwfHSscq0zBFFb0LXibCbjYAnBMufHfibVBmia3SdVVpaT4/640?wx_fmt=png&from=appmsg)

我们会支持这些类型文档的检索：

**文本类文件**:

支持格式：PDF、DOCX、DOC、XLSX、XLS、PPTX、PPT、TXT、MD、CSV、JSON

支持输入网页 URL，系统自动抓取页面正文并导入知识库归档检索

**图片文件（JPG、PNG）**:

上传后通过视觉嵌入模型提取图像特征，同时调用大模型 OCR / 图像理解生成图片描述文本；

支持双向多模态检索：文字搜图片、本地上传图片以图搜图。

**音频文件（MP3、WAV、M4A）**：

上传自动执行 ASR 语音转文字，将完整转录文本归档，依托文本内容参与检索。

**视频文件（MP4）**：

用视频理解模型做全维度内容解析，同步提取音频文字与画面视觉信息，整合生成完整文本内容用于检索，并输出视频多模态向量，实现图文视频跨模态检索。

![](https://mmbiz.qpic.cn/sz_mmbiz_png/NMByQQfVwfd3WS6hGpkGdicb5IW8BBTmHBo9adic4aoVkp6xibibgz8ibCfyntatN1b9ia8erm5eY2ZweXYFmNBEibrHd4mQHfcLsNIKHibsiaicNSXzE/640?wx_fmt=png&from=appmsg)

学完之后，你可以在简历里加上这个项目，类似这样：

**项目描述：**

企业内部知识碎片化严重，跨部门资料无统一归集渠道，传统文档检索效率低下。为盘活企业各类知识资产，集中管理高效复用，因此主导开发了企业级知识库管理平台。包括文档管理、AI 问答、全文搜索、知识图谱、用户权限控制、数据统计等功能。

**技术栈：**

LangChain、LangGraph、DeepAgents、Vercel AI SDK、Nest、Redis、PostgreSQL、Redis、ElasticSearch、Neo4j、MinIO、Docker Compose、Mem0、LangSmith、LangFuse 等

**项目亮点：**

- 向量 + 关键词（PGVector + ElasticSearch） 实现混合检索，用 RRF 融合 和 Reranker 模型重排，实现多路召回，提高检索准确率
- 利用 Neo4j 构建知识图谱，通过 LLM 抽取文档实体、关系自动存入图数据库。用户问题会用 LLM 抽取实体，执行多跳检索，把推理链路和 RAG 的结果融合送入 Prompt 上下文，提升复杂业务问题回答的完整性与逻辑性
- 支持 PDF、Word、TXT 等图文格式文档，支持图片、音视频等多媒体文件，统一解析为 Markdown 文档，会自动提取文档中的图片上传到 Minio，并替换文档中的图片为 url。图片基于 OCR 实现解析、音频基于 ASR、视频基于分片 + 视频理解模型解析成文档。
- Redis 实现短期记忆存储（滑动窗口 + 摘要），Mem0 实现长期记忆分层存储，包括用户级、会话级记忆
- 基于 RBAC 模型搭建分层权限管控体系，落地页面、菜单、按钮三级细粒度权限拦截；同时联动检索逻辑做数据权限隔离，依据当前用户角色过滤文档池，不同人员仅可查询自身权限范围内的知识资料，实现功能权限与数据权限双重隔离，满足多部门资料分级保密需求。
- 基于 LangGraph 实现 Agentic RAG 架构，Agent 自主判别问题复杂度，动态决策调用混合检索、图谱推理等工具，灵活适配多维度复杂业务提问，规避固定检索流程带来的回答局限性
- 基于 ASR + 流式 TTS 实现语音交互，SSE 实现文字流式输出，WebSocket + 流式 TTS 实现语音的同步流式播放。
- 本地开发用 LangSmith 调试，线上用 LangFuse 收集数据，实现全链路观测，记录检索耗时、LLM 调用成本、问答召回来源、模型报错日志等。搭建 RAG 和 Agent 效果量化评估机制，自动跑实验来评估检索效果。

![](https://mmbiz.qpic.cn/sz_mmbiz_png/NMByQQfVwfcZEdwBV9m35VS1cWUGROUjVVBm3KHSkacfDpE7hficNRGdCye4ibOKL7IJsrdXsJ1Zf6dWxzTvPUBRaN3rcft1I0rZlS3xnr06w/640?wx_fmt=png&from=appmsg)

按照这个来写简历，就是一个比较能打的 Agent 项目了。

当然，具体怎么写简历，等我们做完这个项目之后还会细讲，大家先大概感受下。

项目会涉及到一些数据库、中间件用于存储数据：

**PostgreSQL（带 PGVector 向量扩展）**：

存储结构化业务数据 + 文档分片向量

- 用户、角色、权限全量 RBAC 数据：user 用户表、role 角色表、permission 权限表、department 部门表等
- 文档、分片：document 文档表、doc_chunk 文档分片表
- AI 问答会话历史chat_session 对话会话表、chat_message 问答消息记录表

**ElasticSearch（全文关键词检索引擎）**：

文档分片全文索引库，负责关键词召回、全文模糊检索

**Neo4j（知识图谱图数据库）**：

存储实体、关系，支撑多跳图谱推理检索

**Redis（缓存中间件）：**

缓存、临时数据等

- 短期记忆：滑动窗口、近期对话摘要
- 全局缓存数据：用户权限等
- 排行榜：热门文档等

**MinIO（对象存储）：**

存储全部静态文件资源

- 用户上传原始文件：PDF、Word、PPT、图片、音频、视频源文件
- 文档解析资源：解析后内嵌图片

**Mem0（长期记忆存储）**：

- 用户级长期记忆：用户个人偏好、检索偏好、业务角色习惯
- 会话级长期记忆：单次对话上下文

![](https://mmbiz.qpic.cn/mmbiz_png/NMByQQfVwfdDjrNho8UeGGyvbwH1MfwByicbQVB9icVBA9p5rxjp22RIdAzm6lFQicM4kWD78CndH38rgkUoUqSzicgFmH7C2IuKP7khvt8E4Xo/640?wx_fmt=png&from=appmsg)

然后我们梳理下多媒体文档上传解析全流程：

用户上传 PDF / 图片 / 音频 / 视频 → Redis 异步任务队列消费

- 原始文件存入 MinIO；
- 文本文件直接提取内容转为 MD；图片调用视觉嵌入 + 大模型 OCR 生成图文描述；音频 ASR 转写文本；视频视频理解模型提取音频 + 帧画面整合 MD；
- 文档内嵌图片、视频帧图上传 MinIO，MD 内替换为资源 URL；
- MD 原文存入 PostgreSQL document 表；自动切片生成 chunk 存入 PGVector 向量表；
- 分片文本同步写入 ElasticSearch 建立关键词倒排索引；
- LLM 自动抽取分片内实体、关系，写入 Neo4j 构建知识图谱；
- 任务状态更新至 document_task 表，前端实时展示进度。

![](https://mmbiz.qpic.cn/mmbiz_png/NMByQQfVwfetoATJCW2nf9aia7z7pDQzS5V4UzKWTD9icGsWTQOog49c2rGsGWSiagaliayVL4ZMqf8L8B2ZQaOs0cV3nVFyrZy2neqtDrYJfRs/640?wx_fmt=png&from=appmsg)

这里文档上传后的处理耗时比较高，所以我们放到 Redis 任务队列里，异步来做。

加一个任务表来记录进度，前端可以从这个表中查询任务状态。

再梳理下 Agent 问答全流程：

用户输入自然语言提问 → 鉴权校验 Redis 缓存用户权限白名单

- LangGraph Agent 自主判断问题复杂度：简单问题仅调用混合检索，复杂业务问题额外触发图谱多跳推理；
- 多路召回：ES 关键词召回 + PGVector 向量召回；RRF 融合得分，Reranker 重排；
- LLM 抽取问题实体，查询 Neo4j 执行多跳关联检索，获取实体推理链路；
- 过滤所有用户无权限文档分片；
- Redis 读取短期滑动窗口对话摘要，Mem0 拉取用户 / 会话长期记忆；
- 检索分片、图谱推理结果、分层记忆统一拼接至 Prompt 上下文；
- LLM 生成回答，SSE 流式推送文字；可选 TTS 生成语音 WebSocket 同步播放；
- 全链路日志上报 LangFuse，记录耗时、Token 消耗、召回分片、异常报错；
- 问答记录持久化存入 chat_session/chat_message 表。

![](https://mmbiz.qpic.cn/sz_mmbiz_png/NMByQQfVwffa4eC0qtVOyaygS2jTItj3Nd2JI6uAkEfC49FibbSek1GMZHfmaibnicIK8viaOicibJLFy6r25A1Xib1w2tQiaLNYxNAAwQmAdXVPPJg/640?wx_fmt=png&from=appmsg)

权限白名单就是当前登录用户能访问的全部文件夹、文档 ID 集合，放在 redis 里。

我们检索出文档后，会过滤掉无权限的文档，再来生成回答。

有的同学可能会问，那 Dify 之类的知识库呢？

我们跑一下就知道了：

clone 它的代码：

```
git clone git@github.com:langgenius/dify.git
```

**🎬 [视频 1](https://findermp.video.qq.com/251/20304/stodownload?encfilekey=KGDRibp2wkicJjeicMicAu0umFZKic1UgIWibbX4KeDuyrLHRwpFUtpErGTe5d4bk4WUwqRebIZskXF2U3LZV79O2zzw&token=6xykWLEnztIn9MP8pg85ZZIV1Kxoxmv2fJ7EA4jpWdJ4B3jN2eo2kXbwX6SWb5UjWubgib0Xic8keV9vdqxxk1JSNNibwSk82xtxB6ibfA3AADH6I43dAls8nnLyCfkESvFrHe4eK41T6q2vQM1iaNdod0yg4amCjaX4uNDmhAeyqez5BH0YfOo0trI1weDWplRRZg9osSRRBnCjEPKrwxp2nbCNLsGzctsYQZyOSiatFcIyQ&hy=SH&idx=1&m=&scene=2&uzid=1&wxampicformat=503&picformat=200)**

视频地址：https://findermp.video.qq.com/251/20304/stodownload?encfilekey=KGDRibp2wkicJjeicMicAu0umFZKic1UgIWibbX4KeDuyrLHRwpFUtpErGTe5d4bk4WUwqRebIZskXF2U3LZV79O2zzw&token=6xykWLEnztIn9MP8pg85ZZIV1Kxoxmv2fJ7EA4jpWdJ4B3jN2eo2kXbwX6SWb5UjWubgib0Xic8keV9vdqxxk1JSNNibwSk82xtxB6ibfA3AADH6I43dAls8nnLyCfkESvFrHe4eK41T6q2vQM1iaNdod0yg4amCjaX4uNDmhAeyqez5BH0YfOo0trI1weDWplRRZg9osSRRBnCjEPKrwxp2nbCNLsGzctsYQZyOSiatFcIyQ&hy=SH&idx=1&m=&scene=2&uzid=1&wxampicformat=503&picformat=200

Dify 搭建的知识库支持递归分块、向量 + 全文检索 + 重排的混合检索

但是它不支持知识图谱，无法通过 LLM 自动抽取文档中的实体、关系，从而实现多跳关联推理。

缺少分级数据权限管控，无法按部门、岗位隔离知识库与文档，检索时不能自动过滤无权限资料，存在内部涉密文档泄露风险。

不支持完整多模态解析与检索链路，缺少图片 OCR 图文识别、音频 ASR 转写、视频理解解析能力，无法处理图片、音频、视频类业务资料。

平台底层架构封装度高，难以深度对接自定义 Agent，拓展成本极高。

所以，为适配复杂业务场景下的知识检索与智能问答，我们要自己实现知识库。

![](https://mmbiz.qpic.cn/sz_mmbiz_png/NMByQQfVwfdxf62uId5aTmQNzVpiarBZnl7OOgYQmtvBKLaem2N084yhrQWUTkfMJapcq8jNAPMa0qCtG2OgRqEza0rtiaeEicg77Pq57XOdZw/640?wx_fmt=png&from=appmsg)

## 总结

AI 时代，企业知识分散、传统检索低效，自研企业级 AI 知识库是必备数字化基建。

我们大概画了下原型图、梳理了下项目需求

我们会支持多模态的文档检索，文本、图片、音频、视频统一解析为 Markdown 入库，存到向量数据库、ES 里做语义和全文检索

我们梳理了下这个项目怎么写简历，后面也是围绕这个来学：

向量 + 关键词混合检索、知识图谱的推理式多跳检索、多模态文档解析、redis 短期记忆 + mem0 长期记忆、RBAC 文档权限控制、Agentic RAG 架构、LangSmith + LangFuse 监测评估体系

然后分别梳理下了下各种存储组件：PostgreSQL、ElasticSearch、Neo4j、Redis、MinIO、Mem0

之后梳理了下核心的文档上传链路、Agent 问答链路：

文档上传后，原始文件存入 MinIO，内容转成 markdown，分块后存到向量库 + ES。

检索的时候会做意图识别，普通的问题走向量 + 关键词混合检索 + 重排，复杂的问题结合知识图谱做多跳推理，大模型回答后，还可以做语音流式播放。

我们的业务需求比较复杂，Dify 这种知识库不合适，需要自研。

这节大概理清了我们要做的项目，下节正式进入开发。
