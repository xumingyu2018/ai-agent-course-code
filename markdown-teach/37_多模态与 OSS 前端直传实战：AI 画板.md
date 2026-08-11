# 多模态与 OSS 前端直传实战：AI 画板

之前我们的 Agent 都是输入文字、返回文字。

但平时用的很多 Agent 都支持输入图片、返回图片

![](https://mmbiz.qpic.cn/sz_mmbiz_png/NMByQQfVwfeQHhas59xsaibdq524wPbNbhEuTkatVKTLcicj06dSnalby87wtGXibRY33U0Hb4SB1DU210I0w4rOXhmsWVpN8CSZDSXBH7t9iaE/640?wx_fmt=png&from=appmsg#imgIndex=0)

这是怎么实现的呢？

首先模型要用支持多模态的：

**🎬 [视频 1](http://mpvideo.qpic.cn/0b2ezuaaeaaatyabsrsnjbvfbtodalgqaaqa.f10002.mp4?dis_k=63dc4447b5d61d5e0621147751965d80&dis_t=1786438935&play_scene=10110&auth_info=B8iTzqoBPq7b6PULT6uyzKcdLzZcTnUkNAw4SENpQnY7cE9DMikfZmIqdEA4AjwQDXEiFkhE&auth_key=e79532cea88003c3122c401d14c14660)**

![视频1](assets/37_video_1.gif)

![](https://mmbiz.qpic.cn/sz_mmbiz_png/NMByQQfVwfcAPPVu79mjWPj2MAERb91WYviclTFkib1jcA4bPzicsa0Cp3Vm5IN2gu9Yp0mSs9fibbSI89qz42dEqowpibkYJiciacNepjS0YwDlibg/640?wx_fmt=png&from=appmsg#imgIndex=2)

然后我们要用 OSS 来存储图片，拿到 url：

**🎬 [视频 2](http://mpvideo.qpic.cn/0bc3ryadkaaaceac5q2ndrvfbdwdgwhaania.f10002.mp4?dis_k=adf9adea4b02ac9459a7c33e6dc3cf63&dis_t=1786438935&play_scene=10110&auth_info=Vdj9+6RXPKDYv6IJFf7infFLeGJYHnIoZQk3G0U7RXJpcxoZN38daGF9I0JiV2xBWyd1QkwU&auth_key=61d3aecb19bf83c885e5dc60d51d1cd1)**

![视频2](assets/37_video_2.gif)

![](https://mmbiz.qpic.cn/mmbiz_png/NMByQQfVwfezuX8pHPUO6Ylx8m3M4UR1xySDnyvgmjwj4daNraia7meF2M5ZsJx119rvV6qwMicW7V2s7roiasgZibjgkfvAiaRHxer3KH5AibOias/640?wx_fmt=png&from=appmsg#imgIndex=4)

基于多模态的大模型 + OSS，我们就可以实现支持多模态的 Agent

创建项目：

```
mkdir multi-modal-agent
cd multi-modal-agent
npm init -y
```

![](https://mmbiz.qpic.cn/sz_mmbiz_png/NMByQQfVwfeXpP8xAsNauzib7sNLEviboRcgxsU6ia5PpEFiaHG49rbnJbDLNgXBSBjtIncfp4oKRAD8baoFdbo3WYojJcfX7VyABnAatLWwqYs/640?wx_fmt=png&from=appmsg#imgIndex=6)

安装依赖：

```
pnpm install @langchain/core @langchain/openai dashscope-sdk-official dotenv ali-oss
```

创建 src/image-understanding.mjs

```
import'dotenv/config';
import { ChatOpenAI } from'@langchain/openai';
import { HumanMessage } from'@langchain/core/messages';

const model = new ChatOpenAI({
apiKey: process.env.OPENAI_API_KEY,
model: 'qwen-vl-plus',
configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
});

const response = await model.invoke([
new HumanMessage({
    content: [
      { type: 'text', text: '详细描述这张图片的内容' },
      {
        type: 'image_url',
        image_url: {
          url: 'https://dashscope.oss-cn-beijing.aliyuncs.com/images/dog_and_girl.jpeg',
        },
      },
    ],
  }),
]);

console.log('model: qwen-vl-plus');
console.log(response.content);
```

其余案例代码从仓库复制。

跑一下：

**🎬 [视频 3](http://mpvideo.qpic.cn/0b2ejmaaeaaakmab4hknkrvfas6dajfqaaqa.f10002.mp4?dis_k=61c35892c2508925fd85688a7021c58e&dis_t=1786438935&play_scene=10110&auth_info=UZzU35pQb66O6PcMH6q+waIcKGdaRygjZFpqQkduTnltck5INX9OZjcqdkdoAzAdCHAlR05N&auth_key=5e9c2f06146b540c4642c75d2c6dc5c8)**

![视频3](assets/37_video_3.gif)

兼容 openai 协议的大模型就可以用 ChatOpenAI 来调用，其余的直接用 dashscope 的 SDK 来调。

这个过程涉及到了 OSS，传入的图片、视频、音频 url、生成的视频、音频、图片的保存等。

![](https://mmbiz.qpic.cn/sz_mmbiz_png/NMByQQfVwfeibe7zjpt7zkPEJrpLEISfg1miaWl7rJHUb1K90uHcpfhOflpVomP9pGVvZUXvXsbwv3PHxwjp38orcMibHJtMDx7gs9VUM97mOE/640?wx_fmt=png&from=appmsg#imgIndex=8)

我们来完整实现下这个流程。

生成图片传到 OSS 直接后端做就行，返回 oss 的 url

但是用户上传视频，有必要先传到我们服务器，再传到 oss 么？

没必要，这种可以用 OSS 直传。

![](https://mmbiz.qpic.cn/mmbiz_png/NMByQQfVwfeR1b7qia25JNEayHiaW5hISqtSso0wU49pqbRK6IjkicxOJkTHX31LcfKP39GZyficM75MRBp0Nf1Xrr8xfQf4KRmq3k9EIS8XOHQ/640?wx_fmt=png&from=appmsg#imgIndex=10)

阿里云文档里有写：

https://help.aliyun.com/zh/oss/user-guide/uploading-objects-to-oss-directly-from-clients/

（微信最近文章内容不能复制了，代码部分可以直接从仓库复制，文字可以截图让豆包之类的提取）

**🎬 [视频 4](http://mpvideo.qpic.cn/0bc3wmaawaaagiabptcnkbvfbm6dbozqacya.f10002.mp4?dis_k=0bff303250be1d86846c83b4f9c3b8d6&dis_t=1786438935&play_scene=10110&auth_info=V46Yqz04ro/o9g1K+bXIo00vYggaIHVpCjZORDtOcm5xGENnLxlmNip3Rj1QOxQJISJCHBA=&auth_key=cbbd2e4f11c98d0d20a2fca91a4df0eb)**

![视频4](assets/37_video_4.gif)

写一下生成 sts 的代码：

src/sts-gen.mjs

```
import 'dotenv/config';
import OSS from'ali-oss';

asyncfunction main() {

    const config = {
        region: 'oss-cn-beijing',
        bucket: 'agent-bucket123',
        accessKeyId: process.env.OSS_ACCESS_KEY_ID,
        accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
    }

    const client = new OSS(config);
    
    const date = newDate();
    
    date.setDate(date.getDate() + 1);
    
    const res = client.calculatePostSignature({
        expiration: date.toISOString(),
        conditions: [
            ["content-length-range", 0, 1048576000], //设置上传文件的大小限制。      
        ]
    });
    
    console.log(res);
    
    const location = await client.getBucketLocation();
    
    const host = `http://${config.bucket}.${location.location}.aliyuncs.com`;

    console.log(host);
}

main();
```

创建一个前端的 html

public/index.html

```
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
    <script src="https://unpkg.com/axios@1.6.5/dist/axios.min.js"></script>
</head>
<body>
    <input id="fileInput" type="file"/>
    
    <script>
        const fileInput = document.getElementById('fileInput');

        asyncfunctiongetOSSInfo() {
            await'请求应用服务器拿到临时凭证';
            return {
                OSSAccessKeyId: '',
                Signature: '',
                policy: '',
                host: ''
            }
        }

        fileInput.onchange = async () => {
            const file = fileInput.files[0];

            const ossInfo = await getOSSInfo();

            const formdata = new FormData()

            formdata.append('key', file.name);
            formdata.append('OSSAccessKeyId', ossInfo.OSSAccessKeyId)
            formdata.append('policy', ossInfo.policy)
            formdata.append('signature', ossInfo.Signature)
            formdata.append('success_action_status', '200')
            formdata.append('file', file)

            const res = await axios.post(ossInfo.host, formdata);
            if(res.status === 200) {
                
                const img = document.createElement('img');
                img.src = ossInfo.host + '/' + file.name
                document.body.append(img);

                alert('上传成功');
            }
        }
    </script>
</body>
</html>
```

跑一下：

**🎬 [视频 5](http://mpvideo.qpic.cn/0bc3eaakuaaarualmlcnjnvfaigdviqabkqa.f10002.mp4?dis_k=166cbde607a5552aca1e9f8ca9e8c25a&dis_t=1786438935&play_scene=10110&auth_info=U5fqq+FSaKOK7/BZT/3inaZPLTNfSiQjMF9vSxdhEHlvJEcfPH9JazMtcRI4VGxBDCMgE0tA&auth_key=175682782cc65b3f239828062bd0aeb7)**

![视频5](assets/37_video_5.gif)

多模态大模型调用、前端直传 OSS 都跑通了，我们来做一个小实战：AI 画板。

![](https://mmbiz.qpic.cn/sz_mmbiz_png/NMByQQfVwfcjGRz74AlJ6kLibaUibneWSE5cKXpUIskLyCrY8L2NbRf49pQibOz0hWY6ZIlzsKqVqFf0eHvkp9Avakich1Ej2nZuUgqI87nAsiak/640?wx_fmt=png&from=appmsg#imgIndex=12)

![](https://mmbiz.qpic.cn/sz_mmbiz_png/NMByQQfVwfflPmmDULtYmdCefWkjBImqMkoto6s2qRq9ibStdfJiaWYJHXNaUW3BFv17skyOocOFkHul8eWakBhTEPqnkmLI2oLViafDlk8tc0/640?wx_fmt=png&from=appmsg#imgIndex=14)

先来写一下后端的接口：

```
nest new ai-canvas
```

![](https://mmbiz.qpic.cn/mmbiz_jpg/NMByQQfVwfcUBe6nd6wicZ2hKiad2twFuwn05PPVB7rmc8TJO32NEUHFlnkGcXyc00X0OAbqoX5MwQicIRE2zlL6c9a3UlpyvZiaox4URX7IP4E/640?wx_fmt=webp&from=appmsg)

进入项目，创建个新模块：

```
nest g res ai --no-spec
```

![](https://mmbiz.qpic.cn/sz_mmbiz_jpg/NMByQQfVwfc4wicm4OZwNXuJ6whWCkH3McWEuIzDz96M9sF6jH3eQlicHrM4XIxia1WgQNLtJMbJlTZ92aCq2d6hu8Q72ufibaaql4xIAaAyngo/640?wx_fmt=webp&from=appmsg)

安装依赖：

```
pnpm install dashscope-sdk-official dotenv ali-oss  @nestjs/config @nestjs/serve-static
```

把我们前面写的那个图片修改的逻辑拿过来，放到 service 里：

具体代码从仓库复制。

**🎬 [视频 6](http://mpvideo.qpic.cn/0bc37uajmaaa7eam6n2qsfvfb7ods36qbfqa.f10002.mp4?dis_k=b7e02c73034ca9469bc4475ec26a0dd7&dis_t=1786438935&play_scene=10110&auth_info=Veawge8APvLcvPEKHK3lz6NPKWYJHiglZwVsGUZsQXRpJkxMZSwfOmV+cEFrBGsTCSMkRh0U&auth_key=75fadf2b9d71b1646eaf800b11c08e68)**

![视频6](assets/37_video_6.gif)

![](https://mmbiz.qpic.cn/mmbiz_jpg/NMByQQfVwff5DlQvTD1GugoiaEtNE5Q1kUZYvFBkABEtAqZT305ZRo1LoTKH9qy4MAre8XjfzRx6Rib0WnXUwaMibmETJYvQLSkUTm1NBvBAsE/640?wx_fmt=webp&from=appmsg)

![](https://mmbiz.qpic.cn/sz_mmbiz_jpg/NMByQQfVwfeKSic5TbRwCF8m0P5HRK7QZZT3BlELFpAL7TV5iaMTGfWx732g8JJtdG76NvMABzpJChLTxia0A73cneeiaVhiaV5sOvmTyeGckZqg/640?wx_fmt=webp&from=appmsg)

这样我们就把前端直传 OSS，与多模态大模型，综合用了一遍。

## 总结

Agent 很多都支持多模态，比如上传图片识别、生成图片、视频等。

我们用了一下多模态的大模型，阿里的模型有的不支持 openai 协议，需要用 dashscope 的 sdk 来调用。

生成的图片、视频等会放到临时的 oss，有效期大概 24 小时，我们要传到自己的 oss 持久保存。

我们实现了前端直传 OSS，服务端只返回 sts 信息就可以了。

然后把多模态大模型与前端直传 oss 做了一个综合的小实战：AI 画板。

前端直传 OSS + 多模态大模型，会免回经常用到。
