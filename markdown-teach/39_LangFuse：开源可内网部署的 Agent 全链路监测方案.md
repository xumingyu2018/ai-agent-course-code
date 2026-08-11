# LangFuse：开源可内网部署的 Agent 全链路监测方案

前面学了用 LangSmith 做 Agent 的全链路监测，以及跑效果评估的实验。

它是线上的服务，不用自己部署，直接接入就行。

但是，本地调试用 LangSmith 没问题，很方便，配几个环境变量就行，LangChain、LangGraph 开箱即用。

那如果是线上呢？

LangSmith 线上服务是收费的。

如果你想用免费方案，那就得用 LangFuse 了，它是开源的，可以自己部署。

![](https://mmbiz.qpic.cn/mmbiz_jpg/NMByQQfVwfcH6QaCLNeesOdpvcDrJnHdFEwoKIic1QiajonmG6QEH6LFRFZwccur2wEMjicye6VYNYMoSWoA7iaiapZVdR1soVmcgFzRANZnk59M/640?wx_fmt=webp&from=appmsg)

而且它也不绑定具体框架，但各种 Agent 框架都很容易集成。

它有 cloud 开箱即用版，和自己部署，两种方式。

我们先来试一下 cloud 版：

登录一下：

https://cloud.langfuse.com/

**🎬 [视频 1](https://findermp.video.qq.com/251/20304/stodownload?encfilekey=KGDRibp2wkicLiaFYIALqp50XricjKicDrEIzFkxe3kwZMjaCAu6LtW2pbPrpmwGboa9dF4qtb7tfzzXvkibGhmTSYmw&token=Cvvj5Ix3eewIL2QHboXicE5hgR4lT6GGQrbXStcXOibdvd7EjrAOcNMPfaicHMlhhXnburQdcG0sveBrM5pEPboicjglBDsouCml3eg1IQOMkdNaEcxyvOFj8ibgLI2SI7F69pp00iaGVDO4YicJNLOC8avkicBDuVIia9EGkwSOggl28CIc65vYgiaJUAeMwABt0bECKmZMDbOtKArUMZibgV54Qjtd0IcnWPWw0karjOlKKIWF1o&hy=SH&idx=1&m=&scene=2&uzid=1&wxampicformat=503&picformat=200)**

视频地址：https://findermp.video.qq.com/251/20304/stodownload?encfilekey=KGDRibp2wkicLiaFYIALqp50XricjKicDrEIzFkxe3kwZMjaCAu6LtW2pbPrpmwGboa9dF4qtb7tfzzXvkibGhmTSYmw&token=Cvvj5Ix3eewIL2QHboXicE5hgR4lT6GGQrbXStcXOibdvd7EjrAOcNMPfaicHMlhhXnburQdcG0sveBrM5pEPboicjglBDsouCml3eg1IQOMkdNaEcxyvOFj8ibgLI2SI7F69pp00iaGVDO4YicJNLOC8avkicBDuVIia9EGkwSOggl28CIc65vYgiaJUAeMwABt0bECKmZMDbOtKArUMZibgV54Qjtd0IcnWPWw0karjOlKKIWF1o&hy=SH&idx=1&m=&scene=2&uzid=1&wxampicformat=503&picformat=200

和 LangSmith 功能差不多

![](https://mmbiz.qpic.cn/sz_mmbiz_jpg/NMByQQfVwffnJMlSjdsaJZ1jiaMpv1oHwNKuCg59LNMJQ7s7Vwn6dWHfHHzrrtGNM311TtvsWKUUQo651rsbTZjbGK6ESEx2XMyWMXkSYYfU/640?wx_fmt=webp&from=appmsg)

![](https://mmbiz.qpic.cn/mmbiz_jpg/NMByQQfVwfdSpmCPicxt9mo42XvKKy5P3iaiazFzWWic7DjMm3pt0iaeBibhSKUztkCkicicyjiaAsMXfpoBCtC0icAlpat9fDk4jZhVEibfEftQfQZdQE/640?wx_fmt=webp&from=appmsg)

拿到 api key 之后，我们在项目里配置下：

创建项目：

```
mkdir langfuse-test
cd langfuse-test
npm init -y
```

![](https://mmbiz.qpic.cn/sz_mmbiz_jpg/NMByQQfVwfdr9A4p8T1xPDia8icvIcTDVukP4dqN0DUIh1tHDoeFxYk5WNbqI4axsYibI1MqzjhI9vwzHpSWziaKrAFB0C8v0IvlgE5zLVID5rE/640?wx_fmt=webp&from=appmsg)

我们跑一下 deepagents 然后用 langfuse 来收集下信息：

**🎬 [视频 2](https://findermp.video.qq.com/251/20304/stodownload?encfilekey=KGDRibp2wkicKFWHH6KGfJZtVwwvarb1vib7Mk5Latv73tUAw7rzKmctcXq9HZZqZGxpOeOMiadxYwtHHbh0icrLib1Q&token=6xykWLEnztIicXqibiax4LukwYwVvWL0FdH217AujLudsDEApuoQTyj72tqjKo0ZcWeegHFF6WokxLWlCNiaWy5H25pGjAYaPXTXhU0c0SXrvKcFyPgJibZytA4XqIOAtdwMKzL7IjXcAJYGrPRp7hkBvneFXibTg7uic2nsYk0wK7t81ez7dAVKtIUCuiaibMoxF9JuZtt1YmUzRO8mH2OTHtv4JoJ6GYZJFLssJVc3wbSmhtYA&hy=SH&idx=1&m=&scene=2&uzid=1&wxampicformat=503&picformat=200)**

视频地址：https://findermp.video.qq.com/251/20304/stodownload?encfilekey=KGDRibp2wkicKFWHH6KGfJZtVwwvarb1vib7Mk5Latv73tUAw7rzKmctcXq9HZZqZGxpOeOMiadxYwtHHbh0icrLib1Q&token=6xykWLEnztIicXqibiax4LukwYwVvWL0FdH217AujLudsDEApuoQTyj72tqjKo0ZcWeegHFF6WokxLWlCNiaWy5H25pGjAYaPXTXhU0c0SXrvKcFyPgJibZytA4XqIOAtdwMKzL7IjXcAJYGrPRp7hkBvneFXibTg7uic2nsYk0wK7t81ez7dAVKtIUCuiaibMoxF9JuZtt1YmUzRO8mH2OTHtv4JoJ6GYZJFLssJVc3wbSmhtYA&hy=SH&idx=1&m=&scene=2&uzid=1&wxampicformat=503&picformat=200

用 OpenTelemetry 做埋点、函数插桩，收集到的数据转成 LangFuse 的格式，上报服务器，之后在平台就可以看到 trace 的链路了。

然后来跑一下 Agent 评估：

**🎬 [视频 3](https://findermp.video.qq.com/251/20304/stodownload?encfilekey=KGDRibp2wkicIJrr2ibRMb02cP5QtEWIJ7JianxURJFCVlXUNHmVjx92WMDEO0ib1URxsYyw3Q59mt3HNAOlSYZrpLg&token=6xykWLEnztIicXqibiax4LukwYwVvWL0FdHQckHsJCFG7niarGOLYs6d0kGkKp7LTRqBJRicO8s7AbVWWrqK9lGwHGE9viakr6URXpRw4DVxHMKJ2rwI5frmvonC5ib7OgDVrYAtqVWEa4h1yqBnnmxYth40rTZuJQ0FGbu1cIU0BM2JpSpo3dPcSX37gTwUsraiaYdC5PkeALKX1opwNHJsD78TcMdIg62xIXDUELMics3o5IibM&hy=SH&idx=1&m=&scene=2&uzid=1&wxampicformat=503&picformat=200)**

视频地址：https://findermp.video.qq.com/251/20304/stodownload?encfilekey=KGDRibp2wkicIJrr2ibRMb02cP5QtEWIJ7JianxURJFCVlXUNHmVjx92WMDEO0ib1URxsYyw3Q59mt3HNAOlSYZrpLg&token=6xykWLEnztIicXqibiax4LukwYwVvWL0FdHQckHsJCFG7niarGOLYs6d0kGkKp7LTRqBJRicO8s7AbVWWrqK9lGwHGE9viakr6URXpRw4DVxHMKJ2rwI5frmvonC5ib7OgDVrYAtqVWEa4h1yqBnnmxYth40rTZuJQ0FGbu1cIU0BM2JpSpo3dPcSX37gTwUsraiaYdC5PkeALKX1opwNHJsD78TcMdIg62xIXDUELMics3o5IibM&hy=SH&idx=1&m=&scene=2&uzid=1&wxampicformat=503&picformat=200

流程和 LangSmith 一样：

- 创建数据集 dataset、
- 创建评估器 evaluator
- 跑实验 experiment

然后我们跑一下，在 langfuse 平台看一下：

**🎬 [视频 4](https://findermp.video.qq.com/251/20304/stodownload?encfilekey=KGDRibp2wkicLQECJQPRmicuiaOrNYdwH3DGG33qqcHD8DnibmH1iaFKibjwPMoenzMv0Fmmddpy84mrO9ib8ibkA2HBCiaA&token=cztXnd9GyrFrgcCBPEHQr4OHtocOBD653tV7rz4236kYlm30KvJ13GO3YRU1UoAibUqTy7aNQyPaXlKYf7Ps0wiaUial7qBmFsbNHKibIfic5OnGdQicZ3eawUOJJFNOxQndnKibAU4IfYr8Jsk00jE36HibK7ComwYmzIMiaqCTzUia1WuKAicdeEW5XenXJaiaJxahjH3EeicRhpxPB3lMZ0s5z9hfbwEWgOXZCNQnnhiaR3n758Jbs&hy=SH&idx=1&m=&scene=2&uzid=1&wxampicformat=503&picformat=200)**

视频地址：https://findermp.video.qq.com/251/20304/stodownload?encfilekey=KGDRibp2wkicLQECJQPRmicuiaOrNYdwH3DGG33qqcHD8DnibmH1iaFKibjwPMoenzMv0Fmmddpy84mrO9ib8ibkA2HBCiaA&token=cztXnd9GyrFrgcCBPEHQr4OHtocOBD653tV7rz4236kYlm30KvJ13GO3YRU1UoAibUqTy7aNQyPaXlKYf7Ps0wiaUial7qBmFsbNHKibIfic5OnGdQicZ3eawUOJJFNOxQndnKibAU4IfYr8Jsk00jE36HibK7ComwYmzIMiaqCTzUia1WuKAicdeEW5XenXJaiaJxahjH3EeicRhpxPB3lMZ0s5z9hfbwEWgOXZCNQnnhiaR3n758Jbs&hy=SH&idx=1&m=&scene=2&uzid=1&wxampicformat=503&picformat=200

刚才用的是 cloud，然后我们本地部署一下，不然生产环境也是要收费的：

根目录跑一下这个：

```
curl -o docker-compose.yml https://raw.githubusercontent.com/langfuse/langfuse/main/docker-compose.yml
```

**🎬 [视频 5](https://findermp.video.qq.com/251/20304/stodownload?encfilekey=KGDRibp2wkicJNVydcgQXKDH5w9sBJPtyDYiaiaia6ibUHWOlA9Na43DicKH0Jr9ibpuqo5O2OWHlkhhqNc6c9vwaia56ng&token=Cvvj5Ix3eewIL2QHboXicE5hgR4lT6GGQYBk6LCwBAuJKL7cR7bVdN4RTHTiarDdsXVbPlezqkvqOR2D4Sma1THFv5IzBxGQFYCzICYiapeTTDm3ERnlwrAmNmL38pn5QJ5Xq49SgswUvsV7ia2BPXicZFnw8aTiaMVqPB5DOxtYCElkhO4Y3CbazibSKibxPh6ryUYJEv26Gw3PEzcScUrBDhr0B2PjRGaC4dKc2FI6Z4GJ2q8&hy=SH&idx=1&m=&scene=2&uzid=1&wxampicformat=503&picformat=200)**

视频地址：https://findermp.video.qq.com/251/20304/stodownload?encfilekey=KGDRibp2wkicJNVydcgQXKDH5w9sBJPtyDYiaiaia6ibUHWOlA9Na43DicKH0Jr9ibpuqo5O2OWHlkhhqNc6c9vwaia56ng&token=Cvvj5Ix3eewIL2QHboXicE5hgR4lT6GGQYBk6LCwBAuJKL7cR7bVdN4RTHTiarDdsXVbPlezqkvqOR2D4Sma1THFv5IzBxGQFYCzICYiapeTTDm3ERnlwrAmNmL38pn5QJ5Xq49SgswUvsV7ia2BPXicZFnw8aTiaMVqPB5DOxtYCElkhO4Y3CbazibSKibxPh6ryUYJEv26Gw3PEzcScUrBDhr0B2PjRGaC4dKc2FI6Z4GJ2q8&hy=SH&idx=1&m=&scene=2&uzid=1&wxampicformat=503&picformat=200

用一下：

**🎬 [视频 6](https://findermp.video.qq.com/251/20304/stodownload?encfilekey=KGDRibp2wkicKm7uH6XxgwHm0KK2QlA4rz2mOXNeYj0UxExKbJEUR454Ah3LLSL4Dq5gk9wd6PicYDtIMxtIoRz5Q&token=6xykWLEnztIicXqibiax4LukwYwVvWL0FdHbGEQDAC2eVRos7YpvhDIEokb3icoPian7ibQrO2py3fkws4ia9PicicLQ2mxmzl5zmhFmxqPOicre8aSL2tiaVMuR0xIv0y67pKengLlQTz1JIr49VRDXOeMqBkYUib2vRWrhpUtqOkEibkoODTyg3hn4qPtFgpLc082iaE2Mo6qor2mUKFlR7UIKUWbHU1urzcHJtWnpCdKg5Ye2ISx60&hy=SH&idx=1&m=&scene=2&uzid=1&wxampicformat=503&picformat=200)**

视频地址：https://findermp.video.qq.com/251/20304/stodownload?encfilekey=KGDRibp2wkicKm7uH6XxgwHm0KK2QlA4rz2mOXNeYj0UxExKbJEUR454Ah3LLSL4Dq5gk9wd6PicYDtIMxtIoRz5Q&token=6xykWLEnztIicXqibiax4LukwYwVvWL0FdHbGEQDAC2eVRos7YpvhDIEokb3icoPian7ibQrO2py3fkws4ia9PicicLQ2mxmzl5zmhFmxqPOicre8aSL2tiaVMuR0xIv0y67pKengLlQTz1JIr49VRDXOeMqBkYUib2vRWrhpUtqOkEibkoODTyg3hn4qPtFgpLc082iaE2Mo6qor2mUKFlR7UIKUWbHU1urzcHJtWnpCdKg5Ye2ISx60&hy=SH&idx=1&m=&scene=2&uzid=1&wxampicformat=503&picformat=200

这样，只要改一下环境变量，代码一行不用改，tracing、evaluate 等就都收集到了我们自己部署的 langfuse 服务里了。

然后来看一下这个 langfuse 服务的架构：

![](https://mmbiz.qpic.cn/mmbiz_jpg/NMByQQfVwfcCkbbobqvYxWTPVAzM5ic4Hk7TpYEDuKhW6WM1IxZqoVJ9boIAZVEqViasZY2qd1hameeoUGViaI1IMcId9CEnbeQxMIIyoI7zGk/640?wx_fmt=webp&from=appmsg)

大概是这样的关系：

![](https://mmbiz.qpic.cn/sz_mmbiz_jpg/NMByQQfVwffGOlpLCImBWEicvicsTicfQJ9AqLqSiaVWNNd7LIJvK9ibuvxn2tb8nuPUJuum1zvfSqeZPJibbX8vTT3yASBawqf2CFS6icTee9bXUc/640?wx_fmt=webp&from=appmsg)

- langfuse web 是 web 服务，接受请求，把消息放到 redis 的消息队列
- worker 用来消费 redis 消息队列的消息，做具体的处理
- redis 这里主要用作消息队列，再就是缓存
- postgresql 存各种业务数据
- minio 存文件
- clickhouse 存 tracing 等数据，用于查询分析

这个简单了解就行，不重要。

最后来看一下 monitor：

**🎬 [视频 7](https://findermp.video.qq.com/251/20304/stodownload?encfilekey=KGDRibp2wkicLBt0j7oj6t86wUxgbXiaibGNsfhMQmDRnYUKVFbicGsmlPLEDFxaAXtpBpmNFArUaZOmfLwenGrSPqA&token=6xykWLEnztIicXqibiax4LukwYwVvWL0FdHv0xmeWVRuhZsLApdoprC7mwocvT7hJUQhBdIaHUx7NsSNYfS8anicAybx9zz7B1MQIvor7v9nxrd3vBGXWzBRUNIoxgTBd5NuJKVtdYluDaWdnNu4NQaUqnaTs3XWX1iaARKCnhFAFv6KwIsXx00X6gkNmC8F1VUNSiaick1M1jbMMQZhFow7eWv1zpcfsX1JW1a1gWiaLv9ic2qM&hy=SH&idx=1&m=&scene=2&uzid=1&wxampicformat=503&picformat=200)**

视频地址：https://findermp.video.qq.com/251/20304/stodownload?encfilekey=KGDRibp2wkicLBt0j7oj6t86wUxgbXiaibGNsfhMQmDRnYUKVFbicGsmlPLEDFxaAXtpBpmNFArUaZOmfLwenGrSPqA&token=6xykWLEnztIicXqibiax4LukwYwVvWL0FdHv0xmeWVRuhZsLApdoprC7mwocvT7hJUQhBdIaHUx7NsSNYfS8anicAybx9zz7B1MQIvor7v9nxrd3vBGXWzBRUNIoxgTBd5NuJKVtdYluDaWdnNu4NQaUqnaTs3XWX1iaARKCnhFAFv6KwIsXx00X6gkNmC8F1VUNSiaick1M1jbMMQZhFow7eWv1zpcfsX1JW1a1gWiaLv9ic2qM&hy=SH&idx=1&m=&scene=2&uzid=1&wxampicformat=503&picformat=200

它主要是一些指标的统计，再就是告警，可以当某个指标达到阈值的时候，通过 slack 或者 webhook 之类的通知你。

最后再对比一下 LangSmith 和 LangFuse，面试有可能会问：

- 部署与成本：

LangSmith 闭源产品，默认 SaaS 托管。

零运维、按量收费，高 tracing 量生产环境成本高；

企业版（Enterprise 付费签约）提供私有化自托管方案，但成本极高（最低门槛 10 万美金 / 年起）

LangFuse 支持 Cloud 版 + 自建开源部署，生产环境可零成本、数据完全自主可控，无用量扣费压力

- 框架适配性：

LangSmith 深度绑定 LangChain/LangGraph，原生零配置，其他框架兼容差；

LangFuse 基于 OpenTelemetry 埋点，全框架通用，适配任意 Agent 框架，无技术绑定

核心就是上面两个区别。

![](https://mmbiz.qpic.cn/mmbiz_jpg/NMByQQfVwfddmWRzbGCzKSKntvotiaZVfSR2rpuDW0tbiaQ6FlvL3MMtiaK9yDy8mH9AAnfIEfaK7PcT3LzDNhWuHElAn0cH7JNS4hYFxcXbZc/640?wx_fmt=webp&from=appmsg)

> 代码上传了课程仓库： https://github.com/QuarkGluonPlasma/ai-agent-course-code

## 总结

LangSmith 用起来简单，LangChain 生态配几个环境变量就能接入。

但是它是闭源 saas，生产环境按量付费比较贵

虽然支持私有化部署，但门槛高，最低 10 万美金 / 年。

所以 LangFuse 是一个很好的开源替代方案，支持 cloud 和本地 docker compose 跑。

它基于 OpenTelemetry 自动埋点收集数据上报，所以很容易支持各种 Agent 框架。

我们跑了 Tracing，创建了数据集 Dataset 和评估器 Evauator 然后跑了实验 Experiment

功能和 LangSmith 差不多。

后续我们本地调试还是 LangSmith，但要在生产环境跑的 Agent 都会用 LangFuse。
