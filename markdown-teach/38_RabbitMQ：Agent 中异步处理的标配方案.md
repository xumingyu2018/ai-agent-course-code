# RabbitMQ：Agent 中异步处理的标配方案

RAG 流程里，pdf、docx、pptx 等各类文档上传后会解析为 markdown 格式

然后会分片存入向量数据库（比如 Milvus），会存入 ElasticSearch 做全文检索。

那解析的接口做向量化、ES 存储，需要同步等它们完成么？

很明显没必要，这俩完全可以异步来做。

后端如果想做异步处理，一般都是用消息队列 MQ，比如 RabbitMQ

![](https://mmbiz.qpic.cn/mmbiz_jpg/NMByQQfVwfeDh0AicP0gS8oNVoYcRibXLicqc9cx3QLJG67ZZ5jjiaic5HNPD69yoD1WMKwJqKtm9RfSHN447vmwvv0cicdqBFIkec3SicxaJ66fQM/640?wx_fmt=webp&from=appmsg)

解析完文档得到 Markdown 后，往 MQ 发一条消息

两个消费者收到消息后，分别做不同的处理。

RabbitMQ 的架构是这样的：

![](https://mmbiz.qpic.cn/sz_mmbiz_jpg/NMByQQfVwfeFtbbSCicTCgFmSbDAzYOs0WWJiaqzl9O18UejnqRgoUH8PmZtzFqIPRqVZLZmaBeS5ZFXfMSKRib5r9qTcmGKJH8vrNU9nHuhrI/640?wx_fmt=webp&from=appmsg)

Producer 和 Consumer 分别是生产者和消费者。

Connection 是客户端与 RabbitMQ 服务之间的 TCP 物理连接。

我们不会每次收发消息都新建独立 Connection，因为 TCP 连接创建开销较高；

所以在一条 Connection 内部划分多条逻辑通道，也就是 Channel。

生产者和消费者都是绑定到具体的 channel 来收发消息。

Queue 队列，是真正存放消息的容器，消息最终存在队列中等待消费者处理。

整套承载消息接收、路由、转发的 RabbitMQ 服务实例，统称为 Broker。

至于 Exchange，这个是把消息放到不同的队列里用的，叫做交换机。

它负责把我们发的消息按照规则放入不同的 Queue 里

Exchange 主要有 4 种：

- fanout：把消息放到这个交换机的所有 Queue
- direct：把消息放到交换机的指定 key 的队列
- topic：把消息放到交换机的指定 key 的队列，支持模糊匹配
- headers：把消息放到交换机的满足某些 header 的队列

我们分别来试一下：

```
mkdir rabbitmq-test
cd rabbitmq-test
npm init -y
```

![](https://mmbiz.qpic.cn/sz_mmbiz_jpg/NMByQQfVwfdHXzvkHfX0QXulb2b6o4YlBFUG03j7cG0fTUJbYiaJ8MzSx7fu8ibuxBRrQBxo1nD1SA3zam1FSgOy2NayMr3YZA4B72TtZH3ia0/640?wx_fmt=webp&from=appmsg)

先创建 docker-compose.yml 把它跑起来：

```
services:
  rabbitmq:
    image: rabbitmq:3.13-management
    container_name: rabbitmq
    restart: always
    ports:
      - "5672:5672"
      - "15672:15672"
    environment:
      RABBITMQ_DEFAULT_USER: admin
      RABBITMQ_DEFAULT_PASS: Admin@123456
      RABBITMQ_DEFAULT_VHOST: /
    volumes:
      - ./rabbitmq_data:/var/lib/rabbitmq
```

**🎬 [视频 1](http://mpvideo.qpic.cn/0bc3yiakgaaafaaed4lfi5vfbqwdupbabiya.f10002.mp4?dis_k=e061e94b4f1a54fa5d9a49b81ca77eef&dis_t=1786438988&play_scene=10110&auth_info=VKSnnOc0W6j+ga1JXofcs7orKysnMjsYSmw8GWI0KRRoLhszShx6YEdDLAIpLlJvEEcmCzM4&auth_key=14466a614398b2abd47d6a03a138b072)**

![视频1](assets/38_video_1.gif)

然后我们代码连上

nodejs 链接 rabbitmq 是用 amqplib 这个包：

```
pnpm install amqplib
```

先跑一下 direct 类型交换机（代码从仓库复制）：

**🎬 [视频 2](http://mpvideo.qpic.cn/0bc34ybtaaad6yangdlghzvfhzwdgdtagmaa.f10002.mp4?dis_k=c3d6b697705ba3567fbb169f37c8352b&dis_t=1786438988&play_scene=10110&auth_info=AIuYsvU1AKv7jvYXXNPevL57fC8hMWkfTWMxTGFiLRc8KUhkSB4hY0JMd1wrelBgFBdxDzU7&auth_key=d5830729e01a6991299cd95f1ad88e4b)**

![视频2](assets/38_video_2.gif)

这种交换机，会根据消息的 routing key 把消息传给精确匹配 routing key 的队列

![](https://mmbiz.qpic.cn/sz_mmbiz_png/NMByQQfVwfd3oTzJaKpLf6ibBC5n1hpHKGVgxXNF4vMNlxQSKJGIf0YicKCmW4cCbvmupUjxdN0ib1HduCFrAoNTMTRVBzEMMDmmAKBCujDibEw/640?wx_fmt=png&from=appmsg)

然后是 fanout 类型的交换机：

**🎬 [视频 3](http://mpvideo.qpic.cn/0b2eaaaa6aaao4aoy5dfarvfaagdb4aaadya.f10002.mp4?dis_k=f32b4ec8cb9bcb398ab6468757b8752d&dis_t=1786438988&play_scene=10110&auth_info=AvSett42AP/+jvdGWtPfvLp7fCkkMT9LGzBrQzUwIRc+eE5rRxkhN0dMdg0telFgEBdxCTA7&auth_key=ec362b05e3bfdc83d781d6f0bb483aa1)**

![视频3](assets/38_video_3.gif)

这种交换机，不看 routing key，会把收到的消息广播到所有绑定的队列

![](https://mmbiz.qpic.cn/mmbiz_jpg/NMByQQfVwffJIVSYkjxhFSE385524BEHqLv7trbMoPK2w8D3eH76dkpBFka0m8Kh5IjMYUkFlAnwmwKM2Q19iawBFmCJbXSP2xoxQhqbmw6U/640?wx_fmt=webp&from=appmsg)

然后是 topic 类型的交换机

**🎬 [视频 4](http://mpvideo.qpic.cn/0b2eguaaaaaasuaoh4lfezvfanodaa2qaaaa.f10002.mp4?dis_k=50299a5df438b0cd974e6e255c92d454&dis_t=1786438988&play_scene=10110&auth_info=A5zNocNmVqz83f1EWoeEtul6e3l3Mj8QFjQ9HzBmK00/Kh42Rk93ZEUffA8tLgpqQxZ2WWM4&auth_key=897b12b4f4e2e1acddd7bdd7eb2405a5)**

![视频4](assets/38_video_4.gif)

这个类型的交换机是根据通配符类匹配

* 是匹配任意一个段

# 是匹配0 到任意个段

![](https://mmbiz.qpic.cn/mmbiz_jpg/NMByQQfVwfdBvVxwp7iaUSjN33IXaaOpduB6z947TnibWicrydbLBKibvx2XNpwXBIwibvEkdUGzm1mDibRE4eyxzR9cbI2dib8uVVyicsIIMXSvJ9s/640?wx_fmt=webp&from=appmsg)

最后来看一下 headers 类型

**🎬 [视频 5](http://mpvideo.qpic.cn/0bc3lab6qaadw4aawdtgrbvfgwgd5bmah2aa.f10002.mp4?dis_k=0bb77a0371bd2a3e6c1b338e5d9b8099&dis_t=1786438988&play_scene=10110&auth_info=U86DwMEzU6v5i/cUWoCE5rV+d3RyYG8eGDQ4SGFjehFve043SRtyY0BJdl8tKQo6HxJ6VGZq&auth_key=ed854fd683d14f120cafa69919a6e1c8)**

![视频5](assets/38_video_5.gif)

headers 类型的交换机不再看 routing key，而是根据 headers 来匹配

![](https://mmbiz.qpic.cn/mmbiz_png/NMByQQfVwfeaIBibpVRq2s0AmWpbA6icmCgoQZIUjuAqicfs1UbYFw9AAAyO3Zjcx4EL07epSCrEtdG0YbibHKFtiaKo0Lu4FFuXickzpZST7gicXQ/640?wx_fmt=png&from=appmsg)

这样，4 种交换机类型我们就都过了一遍。

![](https://mmbiz.qpic.cn/sz_mmbiz_png/NMByQQfVwfesOm9nmSVW3L7XFFwrDD7oMR2J9dWPx6pgqFVut37FwykskkMfb3aibkMI7dTlLAUCWg1oecu40qrfPmOmuhTDicNIB7fCia33v0/640?wx_fmt=png&from=appmsg)

> 代码上传了课程仓库： https://github.com/QuarkGluonPlasma/ai-agent-course-code

## 总结

这节我们学了 RabbitMQ。

后端的异步任务基本都是通过 mq 来做。

生产者往队列里存入消息，消费者取出来处理，整个过程是异步的。

我们学了 RabbitMQ 的架构，包括 Connection、Channel、Exchange、Queue、Producer、Consumer 这些概念

以及 4 种交换机类型：direct、topic、fanout、headers

后面 Agent 应用涉及到异步的场景，都会用 RabbitMQ 来实现。
