# 从 Tool 开始：让大模型自动调工具读文件

我们和大模型聊天，可以问它一些问题，它告诉你怎么做。

但是大模型没法帮你去做。

比如你想创建一个 react + vite 的 todolist 项目，你直接问大模型，它只能告诉你应该创建哪些文件，代码是什么，但是不能帮你读写文件、执行命令。

但是 cursor 是可以的：

**🎬 [视频 1](http://mpvideo.qpic.cn/0b2epqaeuaaavmaf7zkiunuva7gdjj6aasqa.f10002.mp4?dis_k=3e9d369da57754546342f6c61c27081e&dis_t=1781678037&play_scene=10110&auth_info=d9n4xZJVEY3c7aNUNbzxu7dkAwJ4OgtnGRBiXHo8dxtNfjxCKmU5SnsOZD1XBnpnEEYUOHI=&auth_key=ae6f0f053a46510fb1e3befd9bf0ecb7)**

![视频1](assets/01_video_1.gif)

你让它创建一个 todolist 项目，它会直接给你写入文件。

你还可以让它安装依赖，把项目跑起来：

**🎬 [视频 2](http://mpvideo.qpic.cn/0bc3wiadiaaaiyacczcimnuvbmwdgszaanaa.f10002.mp4?dis_k=d1c2e2a15daaa3043b377b572e779ea3&dis_t=1781678037&play_scene=10110&auth_info=I/n9m9FUEYSBvfUDYean7bM8VlYpbF0zHhViWSs7ckoZKD1BLGA5QyZeMmoDXCwxFB5BbCM=&auth_key=def1d927da0c48ed801d44b69f5c830a)**

![视频2](assets/01_video_2.gif)

这是怎么实现的呢？

开发一些 tool 交给 agent 调用就可以了。

比如读文件、写文件、读取目录、创建目录、执行命令

这节我们来学下 tool：

![](https://mmbiz.qpic.cn/sz_mmbiz_png/JnZIbTicL4jWMUiabDiamSHCjWPuYZq5V66IicEtmwyPY7VUpP3MEJPwL4BcMUFs6Hz18icTLcrOreVCpsIP8dGyMJA/640?wx_fmt=png&from=appmsg)

首先，我们找个大模型来用：

这里我们用阿里的千问，因为每个用户登录都有 100 万免费 token

![](https://mmbiz.qpic.cn/sz_mmbiz_jpg/JnZIbTicL4jWMUiabDiamSHCjWPuYZq5V669E0Rm2WvhxKlPXZsPNKXUba5OjVh1sPvhuROyFaPRjoLGdCN8WhX7g/640?wx_fmt=jpeg&from=appmsg)

够我们学习用了。

当然，就算以后不免费了，买也没多少钱，几十块可以用很久了。

你用别的大模型也一样，都可以。

首先，登录下：

https://bailian.console.aliyun.com/?tab=api#/api

点这里获取 api key：

![](https://mmbiz.qpic.cn/sz_mmbiz_png/JnZIbTicL4jWMUiabDiamSHCjWPuYZq5V66wdgutQ0nicwYYgrBbsoY5bV57RVh7GNmeuhwlzbcGr63o1bR6nzibZfw/640?wx_fmt=png&from=appmsg)

视频演示：

**🎬 [视频 3](http://mpvideo.qpic.cn/0bc3jqabsaaahaaa6d2i7vuvatgddfgaagia.f10002.mp4?dis_k=eb1f1f84d2e07f3f19fd5b023b54be8a&dis_t=1781678037&play_scene=10110&auth_info=I7DztrxXEt+B5KcCMrTzuedlUwd/aAxlSxYwW3BuIUgZLThAK2I6GCYHYGtQDnhlQEdEPXU=&auth_key=2915711cb4b9e279220b7eec81bd707a)**

![视频3](assets/01_video_3.gif)

然后就可以用 apikey 来调模型了。

找个模型：

**🎬 [视频 4](http://mpvideo.qpic.cn/0bc3aaaasaaad4ab7lsihruvaagdbeaaacia.f10002.mp4?dis_k=f6dd5b39643b7e9512d90d5f972a8199&dis_t=1781678037&play_scene=10110&auth_info=JduL+q9QR4XV5f8BZuHxveNuXlV5Pl5lSBxjW3tsfE0fKGxKfmVvQnIGOGgEW3phRExJb3M=&auth_key=e7f43ea3bc03897bfa5e39d2db3a0f12)**

![视频4](assets/01_video_4.gif)

搜 coder 相关的编码模型，这里是生成代码用。每个模型训练的数据集不同，都是用于不同目的。

我们用 qwen-coder-turbo 这个就行。

然后来写代码调用。

创建项目：

```
mkdir tool-test
cd tool-test
npm init -y
```

![](https://mmbiz.qpic.cn/sz_mmbiz_png/JnZIbTicL4jWMUiabDiamSHCjWPuYZq5V66tsm0rYfTS8Zu6ibGBHQpFf7lzuZXht0ZE8PTxD5PRnm4zhvZSib9yxiaA/640?wx_fmt=png&from=appmsg)

用编辑器打开，然后创建一个文件：

src/hello-langchain.mjs

mjs 是 es module 格式的 js 文件的意思，可以用 import、export 语法

```
import { ChatOpenAI } from '@langchain/openai';

const model = new ChatOpenAI({ 
    modelName: "qwen-coder-turbo",
    apiKey: '你的 apiKey',
    configuration: {
        baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    },
});

const response = await model.invoke("介绍下自己");
console.log(response.content);
```

这里的 api key 换成你刚才复制的，然后 base url 是这个：

![](https://mmbiz.qpic.cn/sz_mmbiz_png/JnZIbTicL4jWMUiabDiamSHCjWPuYZq5V66zfg22dXlOHUbqWjkG3ia4Z5wPjKkoDnl47rIAz2wDjEedHiaNTEsGXdg/640?wx_fmt=png&from=appmsg)

安装依赖：

```
pnpm install @langchain/openai
```

跑一下：

```
node ./src/hello-langchain.mjs
```

**🎬 [视频 5](http://mpvideo.qpic.cn/0bc3tiadgaaa3macl4kilzuvbgwdgonaamya.f10002.mp4?dis_k=376adc17bfb7be2eadd6a954c31beefb&dis_t=1781678037&play_scene=10110&auth_info=eNbsoe1RRNiBuqRUZ7P07OJsUAErbwswSBczCy1scxxCKD4QemZsHyZZYz0FCX8wRU5HOyE=&auth_key=546034bb41020835bed3c1fc42bffd41)**

![视频5](assets/01_video_5.gif)

可以看到模型调用成功了。

不过这样把 api key 写死到代码里的方式不好，我们通过 .env 文件来管理，然后用 dotenv 这个包来读取

```
pnpm install dotenv
```

用 dotenv 来读取环境变量：

![](https://mmbiz.qpic.cn/sz_mmbiz_png/JnZIbTicL4jWMUiabDiamSHCjWPuYZq5V660Uu9SVZ13sl9a6EmfP15Fo7NW2ju5c6fy5yujffCcLjrItQIhRFT1g/640?wx_fmt=png&from=appmsg)

dotenv 的作用就是读取 .env 文件，设置到环境变量里

```
import dotenv from'dotenv';
import { ChatOpenAI } from'@langchain/openai';

dotenv.config();

const model = new ChatOpenAI({ 
    modelName: process.env.MODEL_NAME || "qwen-coder-turbo",
    apiKey: process.env.OPENAI_API_KEY,
    configuration: {
        baseURL: process.env.OPENAI_BASE_URL,
    },
});

const response = await model.invoke("介绍下自己");
console.log(response.content);
```

所以我们在 .env 文件里配置这些变量，代码里动态读取：

```
# OpenAI API 配置
OPENAI_API_KEY=你的 api key
OPENAI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1

# 模型配置（可选，默认为 qwen-coder-turbo）
MODEL_NAME=qwen-coder-turbo
```

然后还要添加到 .gitignore，因为这些私密信息是不保存到 git 的，就像数据库的密码一样，都是私下里传文件，不会提交 git

**🎬 [视频 6](http://mpvideo.qpic.cn/0bc3d4adgaaa5uacldkiibuvah6dgmpqamya.f10002.mp4?dis_k=f5037a5f61d5aab16c448496e15957c9&dis_t=1781678037&play_scene=10110&auth_info=dfPR0s9RH4jTv/8BZbWmv+BoAVV8aQkzTEdnXCo8cUVPJDwWeGI3T3RcOGgHDy1jR0oWb3Y=&auth_key=5ec1b448e18bf3067d7ef9610c9756e9)**

![视频6](assets/01_video_6.gif)

好了，准备工作结束！

接下来开发 tool：

其实也很简单，我们先写一个读文件的 tool：

创建 src/tool-file-read.mjs

```
import 'dotenv/config';
import { ChatOpenAI } from'@langchain/openai';
import { tool } from'@langchain/core/tools';
import { HumanMessage, SystemMessage, ToolMessage } from'@langchain/core/messages';
import fs from'node:fs/promises';
import { z } from'zod';

const model = new ChatOpenAI({ 
modelName: process.env.MODEL_NAME || "qwen-coder-turbo",
apiKey: process.env.OPENAI_API_KEY,
temperature: 0,
configuration: {
      baseURL: process.env.OPENAI_BASE_URL,
  },
});

const readFileTool = tool(
async ({ filePath }) => {
    const content = await fs.readFile(filePath, 'utf-8');
    console.log(`  [工具调用] read_file("${filePath}") - 成功读取 ${content.length} 字节`);
    return`文件内容:\n${content}`;
  },
  {
    name: 'read_file',
    description: '用此工具来读取文件内容。当用户要求读取文件、查看代码、分析文件内容时，调用此工具。输入文件路径（可以是相对路径或绝对路径）。',
    schema: z.object({
      filePath: z.string().describe('要读取的文件路径'),
    }),
  }
);

const tools = [
  readFileTool
];

const modelWithTools = model.bindTools(tools);

const messages = [
new SystemMessage(`你是一个代码助手，可以使用工具读取文件并解释代码。

工作流程：
1. 用户要求读取文件时，立即调用 read_file 工具
2. 等待工具返回文件内容
3. 基于文件内容进行分析和解释

可用工具：
- read_file: 读取文件内容（使用此工具来获取文件内容）
`),
new HumanMessage('请读取 src/tool-file-read.mjs 文件内容并解释代码')
];

let response = await modelWithTools.invoke(messages);
console.log(response);
```

这里需要用到 langchain 的核心包，以及 zod：

```
pnpm install @langchain/core zod
```

首先，创建一个模型 model

temperature 是温度，也就是 ai 的创造性，设置为 0，让它严格按照指令来做事情，不要自己发挥

我们没有调用 dotenv.configure，引入了这个模块就行

![](https://mmbiz.qpic.cn/sz_mmbiz_png/JnZIbTicL4jWMUiabDiamSHCjWPuYZq5V66icRNib5OdXiblAZnG1gpYXaVD3LhLBEAyfM89wnGibRtdQ3fC11ib0U4NZw/640?wx_fmt=png&from=appmsg)

然后创建一个 tool，调用 tool 的 api

![](https://mmbiz.qpic.cn/sz_mmbiz_png/JnZIbTicL4jWMUiabDiamSHCjWPuYZq5V664HdElIselqB1iakUfgJIV5oLiaxf27Lav76LspblgDbn47H2H5bRVLtw/640?wx_fmt=png&from=appmsg)

这个很容易看懂，就是函数以及它的名字、描述、参数格式。

因为要给大模型用，你要描述下这个工具是干什么的。

描述下参数的格式。

这里用 zod 包来描述，就是传入一个 object，里面的 filePath 是一个 string

也就是这样：

```
{
  filePath: 'xxx'
}
```

之后把这个 tool 传给大模型：

![](https://mmbiz.qpic.cn/sz_mmbiz_png/JnZIbTicL4jWMUiabDiamSHCjWPuYZq5V66LZiavJGkF6nqQoIqpia8eicTvYjaNX1obftdjS7q2ZQYDYdT82dCaA9icA/640?wx_fmt=png&from=appmsg)

调用下：

![](https://mmbiz.qpic.cn/sz_mmbiz_png/JnZIbTicL4jWMUiabDiamSHCjWPuYZq5V66p3JbOf7p4V7WPmW0iacXiaMrRtCpYNibGf78Lnt3S3ER86puD6v0XKDIQ/640?wx_fmt=png&from=appmsg)

具体的消息有四种：SystemMessage、HumanMessage、AIMessage、ToolMessage

- SystemMessage：设置 AI 是谁，可以干什么，有什么能力，以及一些回答、行为的规范等
- HumanMessage：用户输入的信息
- AIMessage：AI 的回复信息
- ToolMessage：调用工具的结果返回

我们用 system message 告诉 ai，它是一个代码助手，可以读取文件并解释代码内容，给出建议

跑下试试：

```
node ./src/tool-file-read.mjs
```

**🎬 [视频 7](http://mpvideo.qpic.cn/0bc35uadmaaafeabu3sin5uvb3odg3wqanqa.f10002.mp4?dis_k=5838062d56948af427ea3b5ae9d4def6&dis_t=1781678037&play_scene=10110&auth_info=I+L2tuwEEtmBuvBSaLatuLdvA1Z7NAhqTENiWH5tJE4ZKGsWcDM6HiZZNzsKDCZkEE0UbHE=&auth_key=562fb4b9e765857e732e2e50b74d6c3b)**

![视频7](assets/01_video_7.gif)

可以看到 AI 返回的消息是 AIMessage 实例

它返回了这个信息：

![](https://mmbiz.qpic.cn/sz_mmbiz_png/JnZIbTicL4jWMUiabDiamSHCjWPuYZq5V66WeSdjYODHpGkXNvSuEHx2wxBayeicdrQQcwyJLUxvlNVYxbjxgCVeicQ/640?wx_fmt=png&from=appmsg)

就是解析出来我们给的路径，拼接了调用工具的参数。

接下来我们基于这个参数调用下工具不就行了？

![](https://mmbiz.qpic.cn/sz_mmbiz_png/JnZIbTicL4jWMUiabDiamSHCjWPuYZq5V66lLRQglDuo1coOdhKpibAPMOv2nV5Xny6TBeE9WewIqRLmY3YWgh26pA/640?wx_fmt=png&from=appmsg)

根据 tool_calls 的数组，分别从 tools 数组里找到对应的工具，取出来 invoke，传入大模型解析出的参数

最后把工具调用结果作为 ToolMessage 传给大模型，让它继续回答：

![](https://mmbiz.qpic.cn/sz_mmbiz_png/JnZIbTicL4jWMUiabDiamSHCjWPuYZq5V66KcfQ2U05xwz7vW7txDNmKUrO14sbkzPkw5hIYGmHjCcHun03M2Jg4A/640?wx_fmt=png&from=appmsg)

注意，这里要用 toolCall 对应的 id 来关联执行结果，也就是告诉大模型，你让我调用的哪个工具，返回的结果是什么

```
let response = await modelWithTools.invoke(messages);
// console.log(response);

messages.push(response);

while (response.tool_calls && response.tool_calls.length > 0) {

console.log(`\n[检测到 ${response.tool_calls.length} 个工具调用]`);

// 执行所有工具调用
const toolResults = awaitPromise.all(
    response.tool_calls.map(async (toolCall) => {
      const tool = tools.find(t => t.name === toolCall.name);
      if (!tool) {
        return`错误: 找不到工具 ${toolCall.name}`;
      }
      
      console.log(`  [执行工具] ${toolCall.name}(${JSON.stringify(toolCall.args)})`);
      try {
        const result = await tool.invoke(toolCall.args);
        return result;
      } catch (error) {
        return`错误: ${error.message}`;
      }
    })
  );

// 将工具结果添加到消息历史
  response.tool_calls.forEach((toolCall, index) => {
    messages.push(
      new ToolMessage({
        content: toolResults[index],
        tool_call_id: toolCall.id,
      })
    );
  });

// 再次调用模型，传入工具结果
  response = await modelWithTools.invoke(messages);
}

console.log('\n[最终回复]');
console.log(response.content);
```

跑下试试：

**🎬 [视频 8](http://mpvideo.qpic.cn/0bc3w4acoaaa5uaddz2isjuvbn6de63qajya.f10002.mp4?dis_k=a13f9739a20997f3f532e4fceee30199&dis_t=1781678037&play_scene=10110&auth_info=D+Kc1zJDjtTt/14xtKbuuGpUWiw/DGsUEjBZLz12Tx4pbBAsMmtJcw44N1MOLTIfSENgJg==&auth_key=334e1ba19c282917cbeab0dd104b8108)**

![视频8](assets/01_video_8.gif)

![](https://mmbiz.qpic.cn/sz_mmbiz_png/JnZIbTicL4jWMUiabDiamSHCjWPuYZq5V66chnNnvMCtKKHLGuYoM9sN1Ln5egoibPQPcXGkoBNxvia7o3feomboKvQ/640?wx_fmt=png&from=appmsg)

可以看到，检测到了 tool_calls 工具调用，用 read_file 这个工具读取了文件，然后让大模型分析了文件内容，给出了代码解释。

是不是现在大模型就能读文件了！

这就是通过工具给大模型扩展了能力。

> 代码上传了课程仓库： https://github.com/QuarkGluonPlasma/ai-agent-course-code

## 总结

这节我们入门了 langchain，调用了大模型，并且实现了第一个 tool

我们用的千问的模型，因为它有免费额度，获取 api key 后，用 .env 管理。

.env 这个文件不提交 git，都是聊天软件发送的方式口口相传，就和数据库密码一样。

我们用 tool 创建了一个工具，写一下函数，以及加下名字、描述、参数的格式（用 zod 声明）就可以了。

用 model.bindTools 传给大模型，在 system message 告诉它这个工具的信息，以及规范下它的回答流程。

message 分为 SystemMessage、HumanMessage、AIMessage、ToolMessage 四种

之后，直接问大模型某个代码的信息，它就会调用工具读取文件，然后来解答了。

实现了第一个 tool 之后，你可以想一下 cursor 怎么实现，后面我们实现一个简易版 cursor！
