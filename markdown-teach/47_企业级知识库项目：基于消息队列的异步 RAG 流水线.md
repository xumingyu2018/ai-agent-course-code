# 企业级知识库项目：基于消息队列的异步 RAG 流水线

上节更了文档解析入库。

这节我们做一下文档发布后的流程，也就是向量化。

我们用消息队列 RabbitMQ 异步来做。

![](https://mmbiz.qpic.cn/sz_mmbiz_png/NMByQQfVwfcC25ctAGwqp9RbE95KTiaE6IrZJI6VTSe7wAv8QCWZldMS0lUGsmjmzIhyNaYozEB0ExyOXpSv0LIyITQKpqD7rTx9cYiaEiaQIk/640?wx_fmt=png&from=appmsg)

发布后有三个消费者：

- Search：收到 INDEX 消息（带整篇元数据 + 正文）→ 写入 Elasticsearch kh_document，供文档级关键词检索
- RAG：收到「按文档 ID 重建」消息 → 查库拉正文 → 分块 → Embedding → 写入 Elasticsearch kh_chunk（含向量），供语义检索
- KG：收到「按文档 ID 建图」消息 → 查库 → 分块 → 抽实体/关系 → 写入 Neo4j，供知识图谱查询

总之，就是文档发布后，分别做存入向量数据库、全文检索库、图数据库。

异步的用 mq 的消费者来做，三条管线并行、互不影响。

发布接口只负责把 Postgres 里的文档标成已发布，并投递消息

这节先把 RAG 向量化这条链路讲清楚：

也就是：

发布 → 投递 → 消费 → 分块 → 向量化 → 写入 kh_chunk

![](https://mmbiz.qpic.cn/mmbiz_png/NMByQQfVwfflRWC9KWYtyBh0R8sMEMqEOlr6ymlwAP7javzbbUaiaJYqPPOwD8XoXOorYcKraz4ZqQZfPEA6GZFP2NaaaobEbE3qDxrPTaias/640?wx_fmt=png&from=appmsg)

> 现在代码仓库迁移到了 gitcode，可以加我微信 guangguangsunlight 开仓库权限，是在 knowledge-hub-backend 下，按照 v1、v2、v3 分支对应每个章节的代码

首先我们要改一下 docker compose 文件，跑一下相关容器：

```
# RabbitMQ — 文档发布后异步管线（RAG / KG / ES）
  rabbitmq:
    image: rabbitmq:3.13-management
    container_name: knowledge_hub_rabbitmq
    restart: unless-stopped
    ports:
      - "5672:5672"   # AMQP
      - "15672:15672" # Management UI
    environment:
      RABBITMQ_DEFAULT_USER: guest
      RABBITMQ_DEFAULT_PASS: guest
    volumes:
      - ${DOCKER_VOLUME_DIRECTORY:-.}/volumes/rabbitmq:/var/lib/rabbitmq
    healthcheck:
      test: ["CMD", "rabbitmq-diagnostics", "-q", "ping"]
      interval: 10s
      timeout: 10s
      retries: 5

  # Elasticsearch 8.17.0 + IK 中文分词（内置到镜像）
  es:
    build: ./elasticsearch       # 从本地 Dockerfile 构建镜像（自带IK）
    container_name: knowledge_hub_elasticsearch
    ports:
      - "9200:9200"               # ES 访问端口
    environment:
      - discovery.type=single-node  # 单节点运行（开发环境）
      - xpack.security.enabled=false  # 关闭安全认证，免密码访问
      - xpack.security.http.ssl.enabled=false  # 关闭 HTTPS 加密
      - xpack.security.transport.ssl.enabled=false  # 关闭节点传输加密
      - ES_JAVA_OPTS=-Xms512m -Xmx512m  # JVM 内存配置，避免占用过高
    volumes:
      - ${DOCKER_VOLUME_DIRECTORY:-.}/volumes/es/data:/usr/share/elasticsearch/data
    restart: always

  # Kibana 最新稳定版：8.17.0（必须与 ES 版本完全一致）
  kibana:
    image: kibana:8.17.0
    container_name: knowledge_hub_kibana
    ports:
      - "5601:5601"  # Kibana 网页控制台端口
    environment:
      - ELASTICSEARCH_HOSTS=http://es:9200  # 连接 ES 容器内部地址
    volumes:
      - ${DOCKER_VOLUME_DIRECTORY:-.}/volumes/kibana:/usr/share/kibana/data
    restart: always
    depends_on:
      - es  # 等待 ES 启动完成后再启动 Kibana
```

这里加一下 rabbitmq、es、kibana

（直接从代码仓库复制就行）

这里 es 用单独的 Dockerfile 跑，因为要加一下 IK 分词插件

```
# 官方 ES 基础镜像
FROM elasticsearch:8.17.0

# 安装 IK 分词（版本严格和 ES 一致）
RUN elasticsearch-plugin install --batch \
    https://release.infinilabs.com/analysis-ik/stable/elasticsearch-analysis-ik-8.17.0.zip
```

跑一下：

**🎬 [视频 1](http://mpvideo.qpic.cn/0bc36uaiqaaa7yacfxtvojvfb5odrd2qbcaa.f10002.mp4?dis_k=fafb85f8c65835009aa991d2711da1e1&dis_t=1786439581&play_scene=10110&auth_info=cunKgjRO+PqU3wwxgrS+uVEmaWITUS1nEA5GcXIoB2FUF24JN28wQ1ZeR0YrOmITPStJdhk=&auth_key=0608703eed97f9c74177403b735f1f67)**

![视频1](assets/47_video_1.gif)

然后改下代码：

首先改一下 document 模块，加一个 publish 接口

然后加一个 mq 模块，用来封装 RabbitMQ 的发布订阅逻辑

也就是：

发布 → 投递 → 消费

之后加一个 pipeline 模块，用来监听 RabbitMQ 队列，收到消息后的流水线处理

也就是：

消费 → 分块 → 向量化 → 写入 kh_chunk

![](https://mmbiz.qpic.cn/sz_mmbiz_png/NMByQQfVwff7WqibQtibfrAJKuQztkvZQ9geGNpLrC5jia5cMHnX5vibicNiaK6Y76spbSIQfdAJoFFvu8glQ8Pk6yhuESAc8pNFYQCFvwAjZxeHY/640?wx_fmt=png&from=appmsg)

涉及到这三个模块：

![](https://mmbiz.qpic.cn/mmbiz_jpg/NMByQQfVwfdS0n2TPZOwp40zuOpunyuYUjQUibNmz9DngG7Sy7Nbq4fSkEQvdnIECCztJdXrfibibT37L2qwm8BZn5QP5d6xuuRaFSnoxvibM20/640?wx_fmt=webp&from=appmsg)

我们具体看一下代码：

**🎬 [视频 2](http://mpvideo.qpic.cn/0bc34yafoaaapaap2ytvjjvfbzwdk7taavya.f10002.mp4?dis_k=9e0423c698b1af6483c1e05256beb28a&dis_t=1786439581&play_scene=10110&auth_info=DoXT7eFLHKjxwo8Nataw5+xSImFoEQFxbhRYQXAhfAEyXRNmCmY9YEgADkYdfz47Rj4vQXwb&auth_key=7fbad459d248dde45539f45c1a26d0c9)**

![视频2](assets/47_video_2.gif)

这样我们就把 publish 接口到 RabbitMQ 到消费者处理消息

消费者的 分块 → 向量化 → 存到 ES kh_chunk 表的流程理清了

然后详细看一下 Chunk、Embedding、VectorIndex 这三块逻辑：

首先是 Chunk：

**🎬 [视频 3](http://mpvideo.qpic.cn/0bc3hyadiaaaauaj5etvcnvfapwdgq7aanaa.f10002.mp4?dis_k=ec91376c2581e912aba22d5c5ff190ef&dis_t=1786439581&play_scene=10110&auth_info=DODKl/NFGan1l9oGZ4yw47NVJDg5EwImOhQJQSAlKFowABQ6DG84YUxVW00QJT4/GTkpGC0Z&auth_key=676b1e11a203e1f6904ac6c4c09d76e4)**

![视频3](assets/47_video_3.gif)

chunk 拆分就是按照 markdown 格式来的，标题、段落等，拼接到目标块大小，直接用 langchain 的 RecursiveCharacterTextSplitter 来做

然后是 Embedding：

**🎬 [视频 4](http://mpvideo.qpic.cn/0bc3kictaaafuyajxwdqhbvfkuwdgbjakmaa.f10002.mp4?dis_k=514aa468a2d92bf8be5e9a0ec5bd4dd2&dis_t=1786439581&play_scene=10110&auth_info=WJvrnMtNSfv2l4FVYNC4tOgCLjs+R1UtPxEPF3MhfVdkAUBqXmJoM09VAB4XeTZoQm4jGypN&auth_key=49fcfb988a5cbe44478097ba7e693252)**

![视频4](assets/47_video_4.gif)

这个也是直接调用 LangChain 的 OpenAIEmbeddings

这两步就可以体验用 Agent 框架的好处了，干啥都有对应的 API。

最后一步就是把向量存到 ES 的表里：

ElasticSearch 也支持向量字段：

![](https://mmbiz.qpic.cn/mmbiz_jpg/NMByQQfVwfdfWgyEv6meq5Qh0SIPlfTNOxbpvFyr1z3ErJjqpAd1wZysOQ63q5SL50ibY5qM03sSQ0FnTicyMrD4OLjzDzblQ5dWAufiat2vJs/640?wx_fmt=webp&from=appmsg)

指定下对应类型就可以。

这样我们直接用 ES 就能做向量+ 关键词混合检索。

**🎬 [视频 5](http://mpvideo.qpic.cn/0bc3hmaygaab2uactrlu5zvfco6dqm5qdaya.f10002.mp4?dis_k=df6ec771f6940602f58c61be47a358ed&dis_t=1786439581&play_scene=10110&auth_info=BLfN+I1ITfn1lohSZI21trxUJD9uSlMib0MPQHEiKlY4ABY7CWBsMUxUCRkTJDtqFjgpH3pA&auth_key=f8ac163dda5b1c4e488f773c6ef1a70c)**

![视频5](assets/47_video_5.gif)

至此，整个流程就讲了一遍了：

![](https://mmbiz.qpic.cn/sz_mmbiz_jpg/NMByQQfVwffD1ZtyWBP752s5Q5waEuWSmOHEYDlsgPnejeW5icomZG0mvZvd9PQW0VEIEOnHYkgxcdqmCKKqOLWqJCVMZbl7m8HpIBaulNHU/640?wx_fmt=webp&from=appmsg)

然后我们跑一下：

根据这个 curl3.md 来：

```
---

##  发布文档（直接发布，无审核）

DOC_ID='docid'

将草稿（或已发布文档）设为已发布，并投递 RabbitMQ 异步管线：RAG 向量化。

curl -s -X PUT "http://localhost:3000/documents/${DOC_ID}/publish"

成功后 `status=1`，异步消费会执行：

- **RAG**：Markdown 分块 → Embedding → 写入 Elasticsearch `kh_chunk`（dense_vector）

---

GET /_cat/indices?

GET /kh_chunk/_search
{
  "size": 100,
  "query": {
    "match_all": {}
  }
}
```

记得在 .env 配一下环境变量：

```
OPENAI_API_KEY=sk-xxx
EMBEDDING_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
EMBEDDING_MODEL=text-embedding-v3
```

试一下：

**🎬 [视频 6](http://mpvideo.qpic.cn/0b2ekiac2aaaomainydvpzvfauwdfvjaalia.f10002.mp4?dis_k=894d8ac34f5d037b0347c9d60d01fed2&dis_t=1786439581&play_scene=10110&auth_info=WbaUhbdPTKKjwooANIHltrlTdGloRgd3Z0VcRCJzKAVlAUBnVmJtahoAC0tDKGtqEz95SXxM&auth_key=aa7d58c11bb72ae6c01e61ae409a1372)**

![视频6](assets/47_video_6.gif)

测试没问题。

至此，从 publish 接口到 RabbitMQ 的消息队列。

然后消费者的 RAG 流水线：分块、向量化、存到 ES 索引表。

整个流程就都跑通了。

## 总结

这节我们实现了 publish 接口。

发布会修改文档状态，然后发一条消息到 RabbitMQ 消息队列。

消费者监听队列的消息，收到后会拿到文档，做文档分块、向量化、存到 ES 索引表的流水线

当然，这个过程不只是要做向量化，还要存到全文检索库、提取实体存到知识图谱，还有其他的消费者，下节继续实现。
