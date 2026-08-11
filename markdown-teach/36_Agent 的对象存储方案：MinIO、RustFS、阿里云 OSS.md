# Agent 的对象存储方案：MinIO、RustFS、阿里云 OSS

AI Agent 在跑业务的时候，时时刻刻都要读写各种文件。

不管是上传的文档，还是 AI 自己生成的报表、图片视频

普通本地文件夹根本扛不住海量文件的生产场景。

所以要用对象存储（Object Storage）

比如这三类场景：

- 存放 RAG 知识库所有原始文件，给智能问答提供数据源
- 保存 Agent 自动运行产出的报表、图表、运行日志
- 统一存图片、音频、视频，支撑多模态 AI 处理任务

![](https://mmbiz.qpic.cn/sz_mmbiz_jpg/NMByQQfVwfcGxS4JPfFyiaYAiat8CAeVKhdcYF1uDxEA1OYACFicNQz1tvqJyvOtcxa4gyjSRuJWtVWzCzBd69CQFZYIGehkqtSlFlgQw6Jcbc/640?wx_fmt=jpeg&from=appmsg)

（MinIO 是常用的对象存储方案）

单独拿知识库场景来说：

![](https://mmbiz.qpic.cn/mmbiz_png/NMByQQfVwffs4laPCSasb58lQYYFXBmKp6VtgibCzeTGnotUBuVaTev5LiclV0icQlgyxUAjBHuPlrBEm2cwtqQVokFn63g9TVzJnEtjicibz48U/640?wx_fmt=png&from=appmsg)

MinIO 承担着原始文件的存储重任。

各类文档、PDF、网页素材都会先进入数据处理环节，完成文件解析、文本切分、内容清洗与元数据提取。

处理完成后的原始文件，会完整存入 MinIO 对象存储中长久保存。

同时文件对应的名称、来源、切片等元数据写入关系型数据库（PostgreSQL）。

而切分后的文本分片会用嵌入模型向量化，存入向量数据库。

这就走完了知识库完整的数据入库流程。

![](https://mmbiz.qpic.cn/sz_mmbiz_png/NMByQQfVwfcV1Nf8URo62H7x4q4ibseWP1pOo3UTK7ODzWmMNM4j3uPk6biafCvkDFBwl7vCIFZS40fSlHpPTgibHSVHn9uDWbzSJ8CZoSR97g/640?wx_fmt=png&from=appmsg)

等到用户发起提问检索时，先把用户问题用嵌入模型向量化，去向量库做语义检索

向量数据库返回相似度高的文本片段，同时附带对应的文件 ID

检索服务拿着文件 ID 去元数据库，调取这份文件的基础信息

再根据文件 ID 从 MinIO 拉取完整原始文件、原文片段内容

最终把原文内容和检索结果一并返回给提问的用户。

![](https://mmbiz.qpic.cn/sz_mmbiz_png/NMByQQfVwfcndmpGHOQVV7MzQvQgAcT4bX17enuaoRW62nLgxB8epH5sQSOibztO4E5EosJb5vUblxENk9IjDOML47RibjoopiadibEZjbTiaqHI/640?wx_fmt=png&from=appmsg)

整套流程里 MinIO 对象存储的作用不可替代。

向量库只存文本向量，不会存放完整原始文件。

关系数据库仅保管元数据，无法承载大体积二进制附件。

只有 MinIO 能统一存放 PDF、图片、各类附件等大容量素材。

既能保障文件长期安全归档，又能随时按需调取原文溯源。

能和向量库、业务数据库无缝联动。

![](https://mmbiz.qpic.cn/sz_mmbiz_jpg/NMByQQfVwfeCHoBFQ3jicF14dTZ7avsC6RYfd0ickYg78eZkVfsoMxt2qQQ6OSl5nibPSOTu5tDKgvTkqic2MyeSMKWyEoIFXk9P3x5gmiaicLuBE/640?wx_fmt=jpeg&from=appmsg)

当然，对象存储不止有 MinIO

市面上主流可选方案主要分为三类：阿里云 OSS、MinIO、RustFS。

先说阿里云 OSS，属于公有云托管服务。

不用自己搭建服务器，零运维，开箱就能用。

完美适配云上业务，能和阿里云各类产品打通联动。

采用按量计费模式，自动扩容，业务规模越大扩容越省心。

适合线上 SaaS 平台、在线教育这类不想维护存储的团队。

再就是 MinIO，是轻量化私有化方案。

支持 Docker 一键部署，单机、小型集群都能快速搭建。

日常小批量文档存取流畅，搭建成本几乎为零。

但短板也很明显，大批量大文件并发时容易卡顿。

开源协议为 AGPL，如果商用落地会存在版权风险。

更适合中小企业小型知识库、本地测试环境使用。

最后是 RustFS，面向大型私有化集群设计。

支持多服务器分布式部署，海量文件并发场景稳定性更强。

底层基于 Rust 开发，运行时内存占用更低。

同时兼容 S3、POSIX、WebDAV 多种访问协议，适配更广。

开源协议是宽松的 Apache2.0，商用无任何版权约束。

专门匹配集团级多模态知识库、海量音视频、国产化政务国企项目。

综上：

- 如果业务跑在公有云上、想省去运维压力，直接选阿里云 OSS。
- 如果只是小型本地自建知识库、低成本快速落地，优先 MinIO。
- 如果是海量音视频存储、大型集团国产化项目，推荐 RustFS。

![](https://mmbiz.qpic.cn/sz_mmbiz_png/NMByQQfVwfeV51yMn1TibJzF1oKNquKG3F6wUkBfoicJOXyvAognRulIia5tpxjkL2KdHORzG5Z42c4djRmfUt4TG8Xu52Cv0lypOE8rq3CYLI/640?wx_fmt=png&from=appmsg)

这节我们把这三种都用一下：

我们本地文件存储是目录 - 文件的真实树状组织方式：

![](https://mmbiz.qpic.cn/sz_mmbiz_png/NMByQQfVwfeHSoTwQOC1ic2iay4jZpkvNPv5cNcnRZYibf2dboQmTSiagvBE3vrlwzuz6Vk1KbMbwLZE4oiaa5vIGXFQ3BNW2XLbicLIsqAAJ5I2k/640?wx_fmt=png&from=appmsg)

而 OSS 对象存储底层是扁平化结构：

![](https://mmbiz.qpic.cn/mmbiz_png/NMByQQfVwfcvV9ATmiaOV19bdBwv1huYCXDHu8WfsZHWEib4cCVtibEGHkBTeAnEC4mIeb9m5QRBqaDzHKPLE6zibKiaY2YypkbBK3du2RH5nhwA/640?wx_fmt=png&from=appmsg)

所有文件都平铺在同一个桶内，不存在原生文件夹。

阿里云 OSS 官方文档也明确说明，对象存储底层没有真实目录层级：

![](https://mmbiz.qpic.cn/mmbiz_png/NMByQQfVwfczzxHlTcfayIyKLMdJaXqPAQKjv9NdNXKTcZCcf86kGdBiaNkVedYZJ7ZBTvgP0vtKHHF6qmaqhicjF4uUKCwutHGTpVqE7FnGI/640?wx_fmt=png&from=appmsg)

控制台里我们看到的文件夹视图，只是系统模拟出来的效果：

![](https://mmbiz.qpic.cn/mmbiz_png/NMByQQfVwfcl80sLSgTYA4mUkzGv2SicH5gVVQDDgBaCwXugibs1zibu60fre5bRUIibF0gJ46bv0oy25tCjWwnG2QAFgicZSw8prygAsSx9nuMc/640?wx_fmt=png&from=appmsg)

这套虚拟目录的实现逻辑和文件元数据无关。

每个 Object 对象包含三部分核心信息：唯一 Key 标识、文件二进制内容、自定义元数据：

![](https://mmbiz.qpic.cn/mmbiz_png/NMByQQfVwffXgB8AOiae3uQ9jiaxVDX9Ew1NJkJNYZvIv87fVmHxCp5GQoQct22qY8WpFOVRLLbt1iaFerQCCTNtC5GpUE8WpIrEj0tEwQKvFU/640?wx_fmt=png&from=appmsg)

OSS 只是解析文件 Key 里的/斜杠分隔符，渲染出目录分层视图。

用 Key 前缀做分组检索。

手动创建空文件夹时，本质是生成一个以/结尾的 0 字节占位对象。

![](https://mmbiz.qpic.cn/mmbiz_png/NMByQQfVwffyslw7cDQVuT6Ut6e0AZDBJicMRe9UfKOSgHYk6kH5y7ib4NkpwqdFtUOk8JcVL3aibSvibo0dAZBQq1lyOIPLicJgZe0wQpSIDmcs/640?wx_fmt=png&from=appmsg)

除了对象存储 OSS，阿里云也提供了文件存储和块存储的方式：

![](https://mmbiz.qpic.cn/sz_mmbiz_png/NMByQQfVwfeHrlV52XKC9srDAICuqMzcGW3aODfk3sSW8AdxWywQFeWKRlKvn5jLibTLaTP3b2s1czwPCBHuLZYhVmypv9aH46icL86th1kcE/640?wx_fmt=png&from=appmsg)

块存储就是把整块磁盘给你用，你需要自己格式化，存储容量有限。

文件存储就是有目录层次结构，你可以上传下载文件，存储容量有限。

对象存储就是 key-value 存储，分布式的方式实现的，存储容量无限。

这些简单了解就行，绝大多数情况下，我们都是用 OSS 对象存储。

我们买一下阿里云 OSS 服务，5 块钱够用半年：

https://www.aliyun.com/product/oss

**🎬 [视频 1](https://findermp.video.qq.com/251/20304/stodownload?encfilekey=KGDRibp2wkicKPXyBoxPBtjKibw97Iuv7B56dKwSJwFEMibIaqda9orwYl86XDbsTmOnpr9WRSjBicyLkfFdLzjmvkA&token=cztXnd9GyrHYSMz5dRpgtn5GGer2ykRENiaricPia71o42QfoWicicRvHuajHOQBSdv81ufDdOtiaRZCKsNuQicY82wlDLB4mXdmmic9utJCXicqyNCU5WiaKDAfAluYDYnKUNia3BGiaWIAZen7M0EiapUyiafr7qWjyTbkHjpdicLKWjj9Ziashg2odWS1WyOvmJQx0oCBQKF4FBxibPjlKbNicuPSic0NCDXlSaRxf3Fl3pwkvWxEuz8fRk&hy=SH&idx=1&m=&scene=2&uzid=1&wxampicformat=503&picformat=200)**

视频地址：https://findermp.video.qq.com/251/20304/stodownload?encfilekey=KGDRibp2wkicKPXyBoxPBtjKibw97Iuv7B56dKwSJwFEMibIaqda9orwYl86XDbsTmOnpr9WRSjBicyLkfFdLzjmvkA&token=cztXnd9GyrHYSMz5dRpgtn5GGer2ykRENiaricPia71o42QfoWicicRvHuajHOQBSdv81ufDdOtiaRZCKsNuQicY82wlDLB4mXdmmic9utJCXicqyNCU5WiaKDAfAluYDYnKUNia3BGiaWIAZen7M0EiapUyiafr7qWjyTbkHjpdicLKWjj9Ziashg2odWS1WyOvmJQx0oCBQKF4FBxibPjlKbNicuPSic0NCDXlSaRxf3Fl3pwkvWxEuz8fRk&hy=SH&idx=1&m=&scene=2&uzid=1&wxampicformat=503&picformat=200

进到控制台，创建 Bucket，上传文件：

**🎬 [视频 2](https://findermp.video.qq.com/251/20304/stodownload?encfilekey=KGDRibp2wkicKLn0HkmIp8joX8AGfNb1DQ4lX09fscic5LPLx83sg5HrVBHjNVYJMTXOWyYF9U48DhibibgwFibibLiavg&token=6xykWLEnztIaLyKMOgAibmB9XUF5QS8VX5SibUYrFQp0F9ta0CmwbGS2w4cvoxI5vTMYnEnx2NKC9wYXEPN5Uep8D8TVkYMOWtvFticpwNUnfHsYd4SicBx8lMEQVk5OJVMT8uiaoFgEDY4fA81fVIvFQK9uokgWYX7icZ34P1rlMkL0sfqYj12kkIDdwnp1q0Dm26cmtIWEwSfKjdQYicRZ1P0SzuyTMtNvnM4l4c0QwTtfco&hy=SH&idx=1&m=&scene=2&uzid=1&wxampicformat=503&picformat=200)**

视频地址：https://findermp.video.qq.com/251/20304/stodownload?encfilekey=KGDRibp2wkicKLn0HkmIp8joX8AGfNb1DQ4lX09fscic5LPLx83sg5HrVBHjNVYJMTXOWyYF9U48DhibibgwFibibLiavg&token=6xykWLEnztIaLyKMOgAibmB9XUF5QS8VX5SibUYrFQp0F9ta0CmwbGS2w4cvoxI5vTMYnEnx2NKC9wYXEPN5Uep8D8TVkYMOWtvFticpwNUnfHsYd4SicBx8lMEQVk5OJVMT8uiaoFgEDY4fA81fVIvFQK9uokgWYX7icZ34P1rlMkL0sfqYj12kkIDdwnp1q0Dm26cmtIWEwSfKjdQYicRZ1P0SzuyTMtNvnM4l4c0QwTtfco&hy=SH&idx=1&m=&scene=2&uzid=1&wxampicformat=503&picformat=200

很多时候，我们需要在代码里上传，比如知识库里，用户上传的文件，要传到 OSS。

**🎬 [视频 3](https://findermp.video.qq.com/251/20304/stodownload?encfilekey=KGDRibp2wkicJVUQf9bicKDDsC1PVNiaucTcxicXh5C875fnOiciaYYJpLxibwJB1DLNBM3VYjxuRY9nGR3S9Fgk6zyt2A&token=cztXnd9GyrHYSMz5dRpgtn5GGer2ykREsYoSja8d5fVK6M10oh7FsVGQa2ibFicpN0YuDDgFSRE4fnQC5UOPH1cCZwKhs6udxtIc1J4eqs67yltM3M4nVNa7CwmicMGjst9V8Viavu6icnoSy9GY7WmcdKkGt8FJuEum6o3Pmqu6jKs691LCatj01IX8ufIfr05bJjBxoRe39khLI4r1LBic6rwCg0CzA1ibuQK0IpmZaKPJj8&hy=SH&idx=1&m=&scene=2&uzid=1&wxampicformat=503&picformat=200)**

视频地址：https://findermp.video.qq.com/251/20304/stodownload?encfilekey=KGDRibp2wkicJVUQf9bicKDDsC1PVNiaucTcxicXh5C875fnOiciaYYJpLxibwJB1DLNBM3VYjxuRY9nGR3S9Fgk6zyt2A&token=cztXnd9GyrHYSMz5dRpgtn5GGer2ykREsYoSja8d5fVK6M10oh7FsVGQa2ibFicpN0YuDDgFSRE4fnQC5UOPH1cCZwKhs6udxtIc1J4eqs67yltM3M4nVNa7CwmicMGjst9V8Viavu6icnoSy9GY7WmcdKkGt8FJuEum6o3Pmqu6jKs691LCatj01IX8ufIfr05bJjBxoRe39khLI4r1LBic6rwCg0CzA1ibuQK0IpmZaKPJj8&hy=SH&idx=1&m=&scene=2&uzid=1&wxampicformat=503&picformat=200

创建项目：

```
mkdir oss-test
cd oss-test
npm init -y
```

![](https://mmbiz.qpic.cn/sz_mmbiz_png/NMByQQfVwfcpq4JVPMTxSYt2FubsPAglbIibqicRt6wtrDZT7BmzH76FJ30yUD3KryTTbMT5aAIicJAfmicq8JBxEap0GJh8GMjhmXz6AObWjnM/640?wx_fmt=png&from=appmsg)

安装依赖：

```
pnpm install ali-oss dotenv
```

创建 src/oss-upload.mjs

```
import 'dotenv/config';
import OSS from'ali-oss';
import fs from'fs';

const client = new OSS({
// yourRegion填写Bucket所在地域。以华东1（杭州）为例，Region填写为oss-cn-hangzhou。
region: process.env.OSS_REGION,
accessKeyId: process.env.OSS_ACCESS_KEY_ID,
accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
authorizationV4: true,
bucket: process.env.OSS_BUCKET,
});

asyncfunction putStream () {
try {
    // 使用chunked encoding。使用putStream接口时，SDK默认会发起一个chunked encoding的HTTP PUT请求。
    let stream = fs.createReadStream('./zao.png');
    // 填写Object完整路径，例如exampledir/exampleobject.txt。Object完整路径中不能包含Bucket名称。
    let result = await client.putStream('aaa/bbb/first.png', stream);    
    console.log(result); 
  } catch (e) {
    console.log(e)
  }
}

putStream();
```

还有 .env

```
OSS_REGION=
OSS_ACCESS_KEY_ID=
OSS_ACCESS_KEY_SECRET=
OSS_BUCKET=
```

**🎬 [视频 4](https://findermp.video.qq.com/251/20304/stodownload?encfilekey=KGDRibp2wkicICthqEicdMTtP8YtpKSEn1gU91QzgRK05FeMJDV9tVUXBN421jexP2sDPaaKGibiakV0icFkeD2YuW3g&token=6xykWLEnztIaLyKMOgAibmB9XUF5QS8VXLZHn1EpS10uoh6WASXPM51DGhRnkJfCKm05pWTHXl1fXibcjNhCZbhZ0tLtBWBmmMxs6NoVz0g5z0Ribom4ia629vIgLwucPRHIq2C1o1A6epCl7z8feHPuzdSsOHzz6DCZNeOibUZxibibM5yFVjEMs9DEq85m4gDlVzF5bDZpQumNt9qnQWQyjX5bHoNH4THq98dfN3cHfjOR5o&hy=SH&idx=1&m=&scene=2&uzid=1&wxampicformat=503&picformat=200)**

视频地址：https://findermp.video.qq.com/251/20304/stodownload?encfilekey=KGDRibp2wkicICthqEicdMTtP8YtpKSEn1gU91QzgRK05FeMJDV9tVUXBN421jexP2sDPaaKGibiakV0icFkeD2YuW3g&token=6xykWLEnztIaLyKMOgAibmB9XUF5QS8VXLZHn1EpS10uoh6WASXPM51DGhRnkJfCKm05pWTHXl1fXibcjNhCZbhZ0tLtBWBmmMxs6NoVz0g5z0Ribom4ia629vIgLwucPRHIq2C1o1A6epCl7z8feHPuzdSsOHzz6DCZNeOibUZxibibM5yFVjEMs9DEq85m4gDlVzF5bDZpQumNt9qnQWQyjX5bHoNH4THq98dfN3cHfjOR5o&hy=SH&idx=1&m=&scene=2&uzid=1&wxampicformat=503&picformat=200

这样，我们就通过代码完成了 OSS 文件上传。

直接用阿里云的 OSS 是挺方便，但是要花钱，而且企业内部有的资料也不希望上云。

这种情况就要自己搭 OSS 服务了：

比如 MinIO 或者 RustFS

![](https://mmbiz.qpic.cn/sz_mmbiz_png/NMByQQfVwffRWiaHCFXJg9qvqlTwbKGib4mSBWJI0471Ln8eDeia5uXNMaN8bWaK0icLqHBRmgZmLeaKp70b0sYfpWdsHhDYWTrLBLnjhLmsPuc/640?wx_fmt=png&from=appmsg)

创建 docker-compose.yml

```
version: "3.8"

services:
minio:
    image:minio/minio:RELEASE.2025-04-22T22-12-26Z
    container_name:minio-server
    restart:always
    ports:
      # S3 对象存储API端口（程序对接用）
      -"9000:9000"
      # Web图形控制台端口（浏览器访问UI）
      -"9001:9001"
    environment:
      # 登录控制台、S3接口的账号（至少3位）
      MINIO_ROOT_USER:admin
      # 登录密码（至少8位，数字+字母）
      MINIO_ROOT_PASSWORD:Admin@123456
    volumes:
      # 持久化数据到本地 ./minio-data 文件夹
      -./minio-data:/data
    command:server/data--console-address":9001"
```

跑一下：

**🎬 [视频 5](https://findermp.video.qq.com/251/20304/stodownload?encfilekey=KGDRibp2wkicKxatEibt3qHoP9gcunGY92iaBxg6pK2WNOJujxgoM8XgrxdDZibmoPVJUXGic4jU8UsnqxjZxISlAJibg&token=6xykWLEnztIaLyKMOgAibmB9XUF5QS8VXEHT4Cvg7aWHn5ktu7mqR2h1Bic9zV3EWtMD6JbNUonr8J9LXcGATcIKjKdKiam4eoT8TNwopH8dLoBndae3NIwLCg0J2GOyF6S5yFJdkbcmJ7SaU3TicPAiaDibnTBiat2Dwsq4LK4mKCPvvO2EhibVC7NvR1e1G9zdyNo2FRcx8QlIp8RIVZicD8qcDGCKZOu57q4UF1CKsXKRmwFg&hy=SH&idx=1&m=&scene=2&uzid=1&wxampicformat=503&picformat=200)**

视频地址：https://findermp.video.qq.com/251/20304/stodownload?encfilekey=KGDRibp2wkicKxatEibt3qHoP9gcunGY92iaBxg6pK2WNOJujxgoM8XgrxdDZibmoPVJUXGic4jU8UsnqxjZxISlAJibg&token=6xykWLEnztIaLyKMOgAibmB9XUF5QS8VXEHT4Cvg7aWHn5ktu7mqR2h1Bic9zV3EWtMD6JbNUonr8J9LXcGATcIKjKdKiam4eoT8TNwopH8dLoBndae3NIwLCg0J2GOyF6S5yFJdkbcmJ7SaU3TicPAiaDibnTBiat2Dwsq4LK4mKCPvvO2EhibVC7NvR1e1G9zdyNo2FRcx8QlIp8RIVZicD8qcDGCKZOu57q4UF1CKsXKRmwFg&hy=SH&idx=1&m=&scene=2&uzid=1&wxampicformat=503&picformat=200

这样我们就在本地跑了一个 OSS 服务：

![](https://mmbiz.qpic.cn/mmbiz_png/NMByQQfVwfc4VGWJlVrCK6hxPSqlprYUQcice5jia7PfDqrVT6oZ8xFx5n6DXyM4pUArEdcyGgiahLPJlicuaDZKObpW5eSHFfLnj7WoJGqUeCA/640?wx_fmt=png&from=appmsg)

然后我们在代码里用 sdk 上传

```
pnpm install minio
```

创建 src/minio-upload.mjs

```
import 'dotenv/config';
import fs from'fs';
import * as Minio from'minio';

const minioClient = new Minio.Client({
endPoint: 'localhost',
port: 9000,
useSSL: false,
accessKey: process.env.MINIO_ACCESS_KEY,
secretKey: process.env.MINIO_SECRET_KEY,
})

asyncfunction putStream() {
    try {
        const stream = fs.createReadStream('./zao.png');
        const result = await minioClient.putObject('aaa', 'ccc/ddd/hello.png', stream);
        console.log(result);
        console.log('上传成功');
    } catch (err) {
        console.log(err);
    }
}

putStream();
```

**🎬 [视频 6](https://findermp.video.qq.com/251/20304/stodownload?encfilekey=KGDRibp2wkicLQws1ToIU8xtxbxRSdHKrAic9aCvjSCVuvVeGib4gVtZxZ3T51Fhm5GwnMw0xuVibdxXgfN0NRcdDNA&token=cztXnd9GyrHYSMz5dRpgtn5GGer2ykREAhoCRCgcic4wUZQyl3ucKg5zmkSsxc2gh1M5huAJhZqHTZLpQt9PqJKib70UAg1q2eF8CjMry9rhgDytsn0pYYwOvqxv85gNYBHpibodIKwBYK3G5rmCSzPpV9PWMdtwHGj96BSdvwS3HgJGoXQtCrJaT4gZ2clfuVANE94bo80qXNzNpJpFNKibbXoV9fOC6PDyJYtO5xGuI0A&hy=SH&idx=1&m=&scene=2&uzid=1&wxampicformat=503&picformat=200)**

视频地址：https://findermp.video.qq.com/251/20304/stodownload?encfilekey=KGDRibp2wkicLQws1ToIU8xtxbxRSdHKrAic9aCvjSCVuvVeGib4gVtZxZ3T51Fhm5GwnMw0xuVibdxXgfN0NRcdDNA&token=cztXnd9GyrHYSMz5dRpgtn5GGer2ykREAhoCRCgcic4wUZQyl3ucKg5zmkSsxc2gh1M5huAJhZqHTZLpQt9PqJKib70UAg1q2eF8CjMry9rhgDytsn0pYYwOvqxv85gNYBHpibodIKwBYK3G5rmCSzPpV9PWMdtwHGj96BSdvwS3HgJGoXQtCrJaT4gZ2clfuVANE94bo80qXNzNpJpFNKibbXoV9fOC6PDyJYtO5xGuI0A&hy=SH&idx=1&m=&scene=2&uzid=1&wxampicformat=503&picformat=200

你会发现代码和之前阿里云 OSS 的差不多，为什么 OSS 服务都这么相似呢？

因为它们都是遵循 AWS 的 Simple Storage Service（S3）规范的，简称 S3 规范。

所以不管哪家的 OSS，用起来都是差不多的。

![](https://mmbiz.qpic.cn/sz_mmbiz_png/NMByQQfVwfePxp4PS4GLVEHOoybkm9keA2PONDOFOgH9rfWOyDejU242dRZFcHX9fmVtcjhM6Rk3qxnnkLueoAibTveNwCPib3ZBDAUskxcZM/640?wx_fmt=png&from=appmsg)

简单试一下 minio 新版的改动：

**🎬 [视频 7](https://findermp.video.qq.com/251/20304/stodownload?encfilekey=KGDRibp2wkicK3kiat0ct9Iu6atlkicWhsA8VvzfnQQAFFXmDnToBPBB65SXnibbzjBDANYb7JKuPJcTsybxRuvmN0Q&token=6xykWLEnztIaLyKMOgAibmB9XUF5QS8VXJswJvK5MldJ52qLGP9y1WiaLzpB0JWJzqBZ2CZaRiaXDG6AzPaKWYZMdPhYNwdL77SDPJ0xicbJIkEmzTRzkjyHS8VaDJwPbVNfOoPia9vkMhYWyU1mPpxTLk81IaHL0rwXhxq6LlkLNdWYqy792qPygEiasgQsKBtkl9SF8UxVgicnSBicLH2Y9PgNsKFjtAALzGNkXickzgvV0Aaw&hy=SH&idx=1&m=&scene=2&uzid=1&wxampicformat=503&picformat=200)**

视频地址：https://findermp.video.qq.com/251/20304/stodownload?encfilekey=KGDRibp2wkicK3kiat0ct9Iu6atlkicWhsA8VvzfnQQAFFXmDnToBPBB65SXnibbzjBDANYb7JKuPJcTsybxRuvmN0Q&token=6xykWLEnztIaLyKMOgAibmB9XUF5QS8VXJswJvK5MldJ52qLGP9y1WiaLzpB0JWJzqBZ2CZaRiaXDG6AzPaKWYZMdPhYNwdL77SDPJ0xicbJIkEmzTRzkjyHS8VaDJwPbVNfOoPia9vkMhYWyU1mPpxTLk81IaHL0rwXhxq6LlkLNdWYqy792qPygEiasgQsKBtkl9SF8UxVgicnSBicLH2Y9PgNsKFjtAALzGNkXickzgvV0Aaw&hy=SH&idx=1&m=&scene=2&uzid=1&wxampicformat=503&picformat=200

最后再来用一下 RustFS

改下配置文件：

```
version: "3.8"

services:
rustfs:
    image:rustfs/rustfs:latest
    container_name:rustfs-server
    restart:always
    ports:
      -"9000:9000"    # S3 API 端口
      -"9001:9001"    # Web控制台端口
    environment:
      TZ:Asia/Shanghai
      # S3/后台登录账号密钥
      RUSTFS_ACCESS_KEY:admin
      RUSTFS_SECRET_KEY:Admin@123456
      # 开启Web管理控制台
      RUSTFS_CONSOLE_ENABLE:"true"
    volumes:
      -./volumes/rustfs-data:/data
      -./volumes/rustfs-logs:/logs
    command:server/data
```

跑一下：

**🎬 [视频 8](https://findermp.video.qq.com/251/20304/stodownload?encfilekey=KGDRibp2wkicLqFC80B6FYMPL9CzM0ibAcJMcLnnPsabAJqJKsSWZAGwyonfLugNJ6TbjiamiajBTiaehxUINgMx8LuA&token=6xykWLEnztIaLyKMOgAibmB9XUF5QS8VXgADcQ1Gs6nQ9ib6rxqpxwvsTlqsf0Ytsb6IPzYLO3UtrQcOHkvpzEpSjv53fw1F55ibopaKsap03HU4oKrKia8DnaeAPl1R7l8ibEv1fvPsJ1s9h5qr5akE46wQ6xHMeCg9Tz0U4tl2Oa1L6wmzzkBF2mS1kic8Cq7YnWRfZWMCL1iaNMR8eNv0Edp35DrzXuzdZ8ib7YNnBkfLnDA&hy=SH&idx=1&m=&scene=2&uzid=1&wxampicformat=503&picformat=200)**

视频地址：https://findermp.video.qq.com/251/20304/stodownload?encfilekey=KGDRibp2wkicLqFC80B6FYMPL9CzM0ibAcJMcLnnPsabAJqJKsSWZAGwyonfLugNJ6TbjiamiajBTiaehxUINgMx8LuA&token=6xykWLEnztIaLyKMOgAibmB9XUF5QS8VXgADcQ1Gs6nQ9ib6rxqpxwvsTlqsf0Ytsb6IPzYLO3UtrQcOHkvpzEpSjv53fw1F55ibopaKsap03HU4oKrKia8DnaeAPl1R7l8ibEv1fvPsJ1s9h5qr5akE46wQ6xHMeCg9Tz0U4tl2Oa1L6wmzzkBF2mS1kic8Cq7YnWRfZWMCL1iaNMR8eNv0Edp35DrzXuzdZ8ib7YNnBkfLnDA&hy=SH&idx=1&m=&scene=2&uzid=1&wxampicformat=503&picformat=200

除了界面不大一样，功能都是差不多的。

然后在代码里上传个文件；

```
pnpm install @aws-sdk/client-s3
```

因为都兼容 S3 协议，所以所有对象存储服务都可直接使用 AWS 官方 S3 SDK；

前面我们用 ali-oss、minio 写的代码也都可以换成这个 sdk

创建 src/s3-upload.mjs

```
import 'dotenv/config';
import { S3Client, PutObjectCommand } from'@aws-sdk/client-s3';
import fs from'fs';

// 初始化统一S3客户端（RustFS/MinIO/阿里云OSS通用）
const s3Client = new S3Client({
endpoint: process.env.S3_ENDPOINT,
credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  },
forcePathStyle: true,
signatureVersion: 'v4',
region: 'aaa'// 本地私有存储随便填，不影响
});

asyncfunction putStream(objectKey, stream, contentType = 'image/png') {
try {
    const uploadCmd = new PutObjectCommand({
      Bucket: 'hello',
      Key: objectKey,
      Body: stream,
      ContentType: contentType
    });
    await s3Client.send(uploadCmd);
    console.log('上传成功');
  } catch (err) {
    console.error('上传失败', err);
    throw err;
  }
}

asyncfunction main() {
const stream = fs.createReadStream('./zao.png');
await putStream('aaa/bbb/first.png', stream, 'image/png');
}

main();
```

改一下 .env

```
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY_ID=admin
S3_SECRET_ACCESS_KEY=Admin@123456
```

跑一下：

**🎬 [视频 9](https://findermp.video.qq.com/251/20304/stodownload?encfilekey=KGDRibp2wkicLuc6ESCMHgicB9Ffob9Z4TPcmUzS7icE9eChOGicrAUuxGCdkoEObIt8FOKYPjyq4qcmdZ4jJoIUh3A&token=6xykWLEnztIaLyKMOgAibmB9XUF5QS8VXXmD5fU9jcDWc7iamMRnqYGB49m0lQ8f6eVjQhuhficIzibleQRZicEquTaQlpjwicIZAibDOQLcl8UyP4nibPuB7SdWpKuAtdRBXew3uvTLktEDLibGePTldXC2xfiaSfrRj7SbNqLA4YFibo9Tcq1yw9iaCNhpGpdPxSopFXG7O0C1sdP5f0un6anlMS6LwIsoqC07ibibGXPbkwia1oFZXc&hy=SH&idx=1&m=&scene=2&uzid=1&wxampicformat=503&picformat=200)**

视频地址：https://findermp.video.qq.com/251/20304/stodownload?encfilekey=KGDRibp2wkicLuc6ESCMHgicB9Ffob9Z4TPcmUzS7icE9eChOGicrAUuxGCdkoEObIt8FOKYPjyq4qcmdZ4jJoIUh3A&token=6xykWLEnztIaLyKMOgAibmB9XUF5QS8VXXmD5fU9jcDWc7iamMRnqYGB49m0lQ8f6eVjQhuhficIzibleQRZicEquTaQlpjwicIZAibDOQLcl8UyP4nibPuB7SdWpKuAtdRBXew3uvTLktEDLibGePTldXC2xfiaSfrRj7SbNqLA4YFibo9Tcq1yw9iaCNhpGpdPxSopFXG7O0C1sdP5f0un6anlMS6LwIsoqC07ibibGXPbkwia1oFZXc&hy=SH&idx=1&m=&scene=2&uzid=1&wxampicformat=503&picformat=200

至此，我们阿里云 OSS、MinIO、RustFS 就都用了一遍了。

> 代码上传了课程仓库： https://github.com/QuarkGluonPlasma/ai-agent-course-code

## 总结

AI Agent 运行过程中会持续产生、读取大量各类文件。

用户上传的文档、程序自动生成的图表、音视频等都需要稳定存储。

普通本地文件夹无法支撑海量文件并发读写的业务场景

所以做 AI 知识库、多模态 Agent 项目，必须使用对象存储。

比如 RAG 知识库的完整流程：

用户上传的 PDF、网页素材先经过解析、清洗、切片处理。

原始文件会完整存入对象存储长期归档保存。

文件名称、来源、切片信息这类元数据存入 PostgreSQL 关系库。

文本切片经过向量化后，单独存入向量数据库用于语义检索。

用户提问时，向量库返回匹配片段并附带对应文件 ID

程序拿着 ID 去数据库读取文件基础信息

再通过对象存储拉取完整原始文档做溯源展示。

向量库只存向量、数据库只存文字信息，都存不了大体积二进制文件。

只有对象存储能统一承载图片、PDF、音视频等大容量素材。

目前主流可选三类对象存储方案，分别是阿里云 OSS、MinIO、RustFS

阿里云 OSS 是公有云托管服务，不用自己维护服务器，按量自动扩容

适合线上 SaaS、不想投入运维人力的业务团队

MinIO 可以 Docker 快速私有化部署，本地测试、小型知识库用着很方便

但新版社区版阉割了可视化管理功能，商用还存在 AGPL 开源版权风险

RustFS 专为私有化海量文件场景打造，Rust 底层内存占用低、并发稳定

商用无约束，适配多模态国产化项目

三类存储底层全部遵循 S3 标准协议，核心能力基本一致。

只是后台管理界面、商用约束存在区别。

安装 @aws-sdk/client-s3 这一个 aws 的包就能对接所有 OSS 服务，也可以分别用 ali-oss、minio 来对接。

对象存储是各类 AI Agent 存储文件的底层核心支撑，后面会大量用到。
