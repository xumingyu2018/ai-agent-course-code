# AGUI 协议：Vercel AI SDK + LangChain 实现流式组件渲染

我们前面做的 Agent 功能上没啥问题，但是 UI 比较简陋，只有流式的文字：

![](https://mmbiz.qpic.cn/sz_mmbiz_gif/NMByQQfVwfeDF2qrgEbib7BxSq0LwaXxeCODbBLfGiaRhibQXPWItClickIxuNvaTyqS17KdicIc1CFPf9gZTTicVxGh2T1RLXPBKqh63f6f1bWTw/640?wx_fmt=gif&from=appmsg)

而你用 cursor 之类的 Agent，它的界面是这样的：

![](https://mmbiz.qpic.cn/sz_mmbiz_png/NMByQQfVwfdJ7u8AdyZCMvo5AEltWXQFqzib1pTsZ2RjA5TPyBF7ic8vib5DUABKGH95NUAYRyjt0h1zJWPF52vAAFQzcM2aqngbpoyyI6Ih7I/640?wx_fmt=png&from=appmsg)

除了流式的文字，不同的 tool call 有不同的组件来展示，这样体验就好很多。

![](https://mmbiz.qpic.cn/mmbiz_png/NMByQQfVwfdG7CJ49bu9GF73553Zt22Ffy0JPtC7g8mgsfAy3xfT83fDpgY9gUI2YO0khSLLWjgiaMaaKMMv6mmICqnre3Rs4JEJicMcDKhL8/640?wx_fmt=png&from=appmsg)

这种流式返回文字，还能流式渲染组件，需要一套协议。

叫做 AGUI 协议（Agent–User Interaction Protocol），定义 agent 和图形界面怎么交互的

比如我们之前返回的 SSE 消息是这样的：

![](https://mmbiz.qpic.cn/mmbiz_png/NMByQQfVwfeeiajvwOvicOwFtsGOpEgEOyUNwL4cnjaNwibejT9WhtDWtkYmDjb7VabnYxrAQXfxh8mcLC8H8w9gzkXxLT7mVy3ibS8rfibeguTI/640?wx_fmt=png&from=appmsg)

只有文字，并不能区分是文本内容，还是 tool call，需要一些元信息，比如 type。

解决也很简单，返回 json 就好了。

比如这样：

![](https://mmbiz.qpic.cn/sz_mmbiz_png/NMByQQfVwfe73NxecLpDBk2YBKHDWES0STZqrlHyaEUl5A4ntUIgC726TgsgnpeMfo8l32tD3VeLCSDmts6rVfLpwakXicb9FkoiaMiaYGkMO4/640?wx_fmt=png&from=appmsg)

text-start 代表文本流开始

text-delta 是流式的文本数据

text-end 代表文本流结束

如果有 tool call 就是这样：

![](https://mmbiz.qpic.cn/sz_mmbiz_png/NMByQQfVwfcBHeBKGdQzws4rCOTScWc7eFtFT9YrpicPg0b9qJZjJwE8DE8kCsaGLWUUbmmlxSK2aricNSlTJiaUGGJaTZMu4oufMQTrzPq4ZM/640?wx_fmt=png&from=appmsg)

tool-input-start 代表开始接收到 tool 的参数

tool-input-delta 是流式的 tool call 的参数

tool-input-available 代表 tool 的参数接收完

tool-output-available 代表有了 tool 的调用结果，可以从 output 里取

![](https://mmbiz.qpic.cn/mmbiz_png/NMByQQfVwffdPyF6Y1bz9oostYsf8Npsic92UPdI1O8gdCtGX0FueTVmw16sQzlqygWSVqIUNOlYM7H2qJg3WyGHibIbVOQgr2MChNOiadibhsM/640?wx_fmt=png&from=appmsg)

这样 SSE 不止返回流式文本，而是这种 json，那前端不就知道当前是在工具调用还是输出流式文本了么？

自然就可以渲染不同的组件，实现更好的体验。

![](https://mmbiz.qpic.cn/sz_mmbiz_gif/NMByQQfVwff6PU4c0zazEpD0jhbB7Es5sFicHF4OibVNwzUyWJianQhRaxFtT38dafRreBq4NMthYNSfkC0xLpgFeZ3RzPYwLECHuhZTGNPlfM/640?wx_fmt=gif&from=appmsg)

上面的是 Vercel AI SDK 实现的协议，我们直接用它那个就行。

https://ai-sdk.dev/docs/ai-sdk-ui/stream-protocol#data-stream-protocol

在 Vercel AI SDK 里叫做 Data Stream Protocol

Vercel AI SDK 提供了这些包：

- ai 包：写 agent 逻辑
- @ai-sdk/openai、 @ai-sdk/anthropic 等包：对接不同的大模型，就和 langchain 的 ChatModel 一样
- @ai-sdk/react、@ai-sdk/vue 等包：对接后端接口，实现页面渲染

![](https://mmbiz.qpic.cn/sz_mmbiz_png/NMByQQfVwffd4BibMJduMAeBoOxibe6lGozjedhicobhBlXU3viagrcEg7ILeH77BmqwPHbibiajDXOmUaRWhcvjOllNAW5suwUgpy3RAmFiam2OUg/640?wx_fmt=png&from=appmsg)

用它也可以写 Agent，但它功能比较少，我们只用它的 UI 方面的功能，就是刚才的那套 AGUI 的协议。

它提供了和 LangChain 的集成包 @ai-sdk/langchain

![](https://mmbiz.qpic.cn/sz_mmbiz_png/NMByQQfVwfeAup7icRyicthiarsUTjxQeN4lCUxWXeKgWibyWYats9zXNRWFYsNwj7o1G59vqr0krGB0a3NXXfXSrudRDUxFgW9yRZAzwhuBVJs/640?wx_fmt=png&from=appmsg)

我们用 LangChain 写 Agent 部分，然后复用它这套 AGUI 协议来给前端传输消息

![](https://mmbiz.qpic.cn/sz_mmbiz_png/NMByQQfVwfeDwJZ787ic0AFxWGeR0YgSZcibmqUHt1SAoJYYINx5ibEtZuj8YX9cfY4uUiauvLL3MDxLj58BDWhJMVzWz1qzicQt8BM1oMkyicrj4/640?wx_fmt=png&from=appmsg)

前端用 @ai-sdk/react、@ai-sdk/vue 等来解析 SSE 的消息，拿到 messages，用不同组件渲染就可以了。

我们来创建个后端项目：

```
nest new agui-backend
```

![](https://mmbiz.qpic.cn/mmbiz_png/NMByQQfVwfe5FvgBUrFDc8okIHzhV0KMTwsLGrYNC1LppUeXfYcLBCrs4Xn2mutl9tsT3F0NdkO67jbxVtCZpGoDdG3lsQBEFKOTpYtLSmo/640?wx_fmt=png&from=appmsg)

安装用到的包：

```
pnpm install @langchain/core @langchain/openai @nestjs/config zod
```

创建 .env 配置文件：

```
OPENAI_API_KEY=sk-xx
OPENAI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
MODEL_NAME=qwen-plus

BOCHA_API_KEY=sk-xx
```

然后引入 ConfigModule 读取配置：

![](https://mmbiz.qpic.cn/sz_mmbiz_png/NMByQQfVwfdDhZa1icgYcz5LDG3XfuvfM6hJ5qH55rX2882lSDWEfMb60v3W1JTaFAn7eErYn6cwmZzn6QFFriaticsk1sicfBhookmS1pPia9JA/640?wx_fmt=png&from=appmsg)

创建 ai 模块：

```
nest g module ai
nest g controller ai --no-spec
nest g service ai --no-spec
```

![](https://mmbiz.qpic.cn/sz_mmbiz_png/NMByQQfVwfeOwSqibvlQ7ib6aNh9uRCA2UlETwbQxHKOMmeldTTbJ91KvIC5DtO9dvVCQF8hNbQxOS63NoZ1mDSwTbQial5tCsrfItMplYptTs/640?wx_fmt=png&from=appmsg)

然后来写个 SSE 的 ai 接口：

改下 AiModule，加一下网络搜索的 tool

```
import { Module } from'@nestjs/common';
import { AiService } from'./ai.service';
import { AiController } from'./ai.controller';
import { ConfigService } from'@nestjs/config';
import { ChatOpenAI } from'@langchain/openai';
import { tool } from'@langchain/core/tools';
import z from'zod';

@Module({
controllers: [AiController],
providers: [AiService,
    {
      provide: 'CHAT_MODEL',
      useFactory: (configService: ConfigService) => {
        returnnew ChatOpenAI({
          model: configService.get('MODEL_NAME'),
          apiKey: configService.get('OPENAI_API_KEY'),
          configuration: {
            baseURL: configService.get('OPENAI_BASE_URL'),
          },
        });
      },
      inject: [ConfigService],
    },
    {
      provide: 'WEB_SEARCH_TOOL',
      useFactory: (configService: ConfigService) => {
        const webSearchArgsSchema = z.object({
          query: z
            .string()
            .min(1)
            .describe('搜索关键词，例如：公司年报、某个事件等'),
          count: z
            .number()
            .int()
            .min(1)
            .max(20)
            .optional()
            .describe('返回的搜索结果数量，默认 10 条'),
        });
    
        return tool(
          async ({ query, count }: { query: string; count?: number }) => {
            const apiKey = configService.get<string>('BOCHA_API_KEY');
            if (!apiKey) {
              return'Bocha Web Search 的 API Key 未配置（环境变量 BOCHA_API_KEY），请先在服务端配置后再重试。';
            }
    
            const url = 'https://api.bochaai.com/v1/web-search';
            const body = {
              query,
              freshness: 'noLimit',
              summary: true,
              count: count ?? 10,
            };
    
            const response = await fetch(url, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(body),
            });
    
            if (!response.ok) {
              const errorText = await response.text();
              return`搜索 API 请求失败，状态码: ${response.status}, 错误信息: ${errorText}`;
            }
    
            let json: any;
            try {
              json = await response.json();
            } catch (e) {
              return`搜索 API 请求失败，原因是：搜索结果解析失败 ${(e as Error).message}`;
            }
    
            try {
              if (json.code !== 200 || !json.data) {
                return`搜索 API 请求失败，原因是: ${json.msg ?? '未知错误'}`;
              }
    
              const webpages = json.data.webPages?.value ?? [];
              if (!webpages.length) {
                return'未找到相关结果。';
              }
    
              const formatted = webpages
                .map(
                  (page: any, idx: number) =>
                    `引用: ${idx + 1}
    标题: ${page.name}
    URL: ${page.url}
    摘要: ${page.summary}
    网站名称: ${page.siteName}
    网站图标: ${page.siteIcon}
    发布时间: ${page.dateLastCrawled}`,
                )
                .join('\n\n');
    
              return formatted;
            } catch (e) {
              return`搜索 API 请求失败，原因是：搜索结果解析失败 ${(e as Error).message}`;
            }
          },
          {
            name: 'web_search',
            description:
              '使用 Bocha Web Search API 搜索互联网网页。输入为搜索关键词（可选 count 指定结果数量），返回包含标题、URL、摘要、网站名称、图标和时间等信息的结果列表。',
            schema: webSearchArgsSchema,
          },
        );
      },
      inject: [ConfigService],
    },
  ],
})
exportclass AiModule {}
```

这里创建了 ChatModel 和网络搜索的 tool 的 provider

然后在 AiService 注入：

```
import { Inject, Injectable } from'@nestjs/common';
import { ChatOpenAI } from'@langchain/openai';
import { AIMessage, AIMessageChunk, createAgent, HumanMessage, SystemMessage, ToolMessage } from'langchain';
import { UIMessage } from'ai';
import { toBaseMessages, toUIMessageStream } from'@ai-sdk/langchain';

@Injectable()
exportclass AiService {
  private readonly agent: ReturnType<typeof createAgent>;

constructor(
    @Inject('WEB_SEARCH_TOOL') private readonly webSearchTool: any,
    @Inject('CHAT_MODEL') model: ChatOpenAI
  ) {
    this.agent = createAgent({
        model,
        tools: [this.webSearchTool],
        systemPrompt:
          '你是 AI 助手，需要最新信息、事实核查或联网信息时，请使用 web_search 工具搜索后再作答。',
      });
  }

async stream(messages: UIMessage[]) {
    const lcMessages = await toBaseMessages(messages);
    const lgStream = awaitthis.agent.stream(
      { messages: lcMessages },
      {
        streamMode: ['messages', 'values'],
        recursionLimit: 12,
      },
    );

    return toUIMessageStream(lgStream as AsyncIterable<AIMessageChunk>);
  }
}
```

这次我们不再手写 agent loop，自己调用 tool 了，直接用 langchain 封装好的 createAgent 的 api

然后用 @ai-sdk/langchain 这个适配器：

把传入的 ai sdk 的 messages 转成 langchain 的 BaseMessage 传给 agent

再把返回的 stream 转成 ai ask 的 ui message stream 返回

这样返回的流式内容就是 SSE 的 Data Stream Protocol 的协议数据了。

我们改下 AiController，加一下接口：

```
import { BadRequestException, Body, Controller, Get, Post, Query, Res, Sse } from'@nestjs/common';
import type { Response } from'express';
import { AiService } from'./ai.service';
import { pipeUIMessageStreamToResponse, UIMessage } from'ai';

@Controller('ai')
exportclass AiController {
constructor(private readonly aiService: AiService) {}

/**
    本地测试：
    curl -N -sS -X POST 'http://localhost:3000/ai/chat' \
      -H 'Content-Type: application/json' \
      -d '{"messages":[{"id":"1","role":"user","parts":[{"type":"text","text":"北京今天的天气"}]}]}'
   */
  @Post('chat')
async postChat(
    @Body() body: { messages?: UIMessage[] },
    @Res({ passthrough: false }) res: Response,
  ): Promise<void> {
    if (!body?.messages || !Array.isArray(body.messages)) {
      thrownew BadRequestException('Invalid JSON');
    }

    const stream = awaitthis.aiService.stream(body.messages);
    pipeUIMessageStreamToResponse({ response: res, stream });
  }
}
```

因为 ai sdk 转换好的就是 SSE 的流，我们不需要自己再做处理，直接把它传给 response 就可以了。

安装用到的 ai sdk 的包：

```
pnpm install ai @ai-sdk/langchain
```

用上面那个 curl 测试下：

对接成功！

![](https://mmbiz.qpic.cn/mmbiz_png/NMByQQfVwfdpcKjlsNRYIjIicJx25u08rQ3IX6dqGXajfsurzQ2LcXEFiczCXxMhicXH8ujNFiaDZAovytysbq7BbDo8TDyXGzHoloDXStIB4Ew/640?wx_fmt=png&from=appmsg)

![](https://mmbiz.qpic.cn/mmbiz_png/NMByQQfVwffHG4LTlNYFvm4PrFia5w5jNhiaBKWp3rEZlQq0Z3jVBOnrRHYMAQrlLJuBfBMkPCfo7EKQibaF5A4URvwBw8KIibnIsoGJFlicGPYg/640?wx_fmt=png&from=appmsg)

现在就把 langchain 的 agent 的 stream 转成了 ai sdk 的 Data Stream Protocol 协议的格式了。

接下来创建前端项目：

```
npx create-vite agui-frontend
```

![](https://mmbiz.qpic.cn/sz_mmbiz_png/NMByQQfVwfeJiaL2WCn4cH2XSPN3icX2MBXD9ghvwQPCOlhBliafMynX9UFmTRvh3xP7xvcWg7PExF1zaeCeibd8yxlT1oUBwXeoLOeltsezgzk/640?wx_fmt=png&from=appmsg)

这里创建的是 react 项目，用 @ai-sdk/react 来对接，你换成 vue 项目，用 @ai-sdk/vue 对接也可以。

vercel ai sdk 支持各种前端框架

在后端允许下跨域访问接口：

![](https://mmbiz.qpic.cn/sz_mmbiz_png/NMByQQfVwfeRY3GYSEJIAnk2d8pQ27blQFvDyqs0PFXAXibly5gHJhjlribFOpTeVdJnTBQqdWicxibibDrRsp5mV7IE18jDkPM917bxzgiagnyx8/640?wx_fmt=png&from=appmsg)

然后来改前端页面：

安装 @ai-sdk/react 和 ai 包

```
pnpm install @ai-sdk/react ai
```

核心逻辑是这个：

@@IMG:|https://mmbiz.qpic.cn/mmbiz_png/NMByQQfVwffZGExUbF4ZhUh3yltQnZcv74IViaSvD6Yak5ZkGpRCsgLMsKGBP99EKt8lB0bgaZW5bHYofxXeVh403lkWdiaEz1wtp2Zw0aJCY/640?wx_fmt=png&from=appmsg@@

用 useChat 连接后端的 SSE 接口，连接方式用 DefaultChatTransport

这样就可以拿到 messages 了，不用自己解析

message 有 id、role、parts 属性：

![](https://mmbiz.qpic.cn/sz_mmbiz_png/NMByQQfVwfcorB1hyADgIxWcEiaM40vOILOEJwaqyHNa5z60YaNQ8ApntuCutKAEOvAoAClicd390bA93qibXibfMiad4ibulwhphPjq6PCpn8324/640?wx_fmt=png&from=appmsg)

创建个组件渲染 parts 部分：

ai 包提供了 isToolUIPart、getToolName 的 api

![](https://mmbiz.qpic.cn/sz_mmbiz_png/NMByQQfVwfdduKFNQL2QxxaicnrflsEUxWYxwx4oXeyib4mB7zFKygNOFYfx5y9WrRs5d2mCtMwQW4uRiby8OMGzrcb6B0HJJhEYp8bu83rbzk/640?wx_fmt=png&from=appmsg)

我们可以用它来判断当前 part 是不是 tool call

![](https://mmbiz.qpic.cn/sz_mmbiz_png/NMByQQfVwfdNrCwSiaLwADMVRZsQZnLJ4ca16nVfhUdUEvd6MicNwR0BNMcGHGcp00pODo0DEhF37C5w5jGVhQKb2duF2nGIqVbkj07eJSFVk/640?wx_fmt=png&from=appmsg)

如果不是，就是渲染文本，如果是就是渲染对应的 tool 的组件。

![](https://mmbiz.qpic.cn/sz_mmbiz_png/NMByQQfVwfdHDF67E6oLaMW8VjEDqRHhtsNHhZCO5IFdWCHqIXZKhylDibQibRb6VqdZNFVeV9qTj4ia0X04KPRunUyPRhzHjOoHYvT9LOUNec/640?wx_fmt=png&from=appmsg)

用 getToolName 拿到 part 的工具名

目前只有 web search 的 tool，根据 state 来渲染 pending、error 状态的组件，还有成功后的组件

就像前面分析的，output-available 阶段可以拿到 output：

![](https://mmbiz.qpic.cn/sz_mmbiz_png/NMByQQfVwfcLjyaCngDvZnialeQibSZTx5H4mqmQYEicqxz50u0ATT1LR3HEf3YIfeYu6Aia8cgUruVrzjw98s1y5WQr8N91jm06wCicaHZRpkso/640?wx_fmt=png&from=appmsg)

根据不同 tool 的 output 的格式做下渲染就可以了。

具体代码可以从仓库复制，核心的就是刚才讲的这几个，其余的不重要。

跑一下：

```
npm run dev
```

现在就不只是流式渲染文本了，还会流式渲染 tool call 对应的组件

![](https://mmbiz.qpic.cn/sz_mmbiz_png/NMByQQfVwfcQlibozrss82bbfIwvVY0v5bzIHngaZ4nrlvxCd8MebHuYMrC2JjFd3IeCP1HqyVfiaXfP7YxWMCSlaODMpHkSwNJX0hSAjJjib4/640?wx_fmt=png&from=appmsg)

但现在流式文本部分的 markdown 还没处理：

![](https://mmbiz.qpic.cn/sz_mmbiz_png/NMByQQfVwfc2bl01RvvzDBbG8JQlJDy2jibu3l0AFTtlia4dYkiawstgCXhxIX4b95GV4JoXic5gQx9kRjGhfsTECtjtMicTuVww3ec4OwOEJbs4/640?wx_fmt=png&from=appmsg)

豆包里是这样的：

我们加一个流式渲染 markdown 对应组件的库 Streamdown

安装依赖：

```
pnpm install streamdown @streamdown/code @streamdown/mermaid
```

这样流式的 markdown 文本就会用对应组件来渲染了：

![](https://mmbiz.qpic.cn/sz_mmbiz_png/NMByQQfVwffAicQnjViaIfC3DWSO8kXZtXN2I88nD1mcnlw2z3SwFavBoFIJFOgesb1bF7JD0G64OjR2RXC5XERSvJX0hVzIG1OwGYMmPh6u0/640?wx_fmt=png&from=appmsg)

![](https://mmbiz.qpic.cn/mmbiz_png/NMByQQfVwfdKAccgibR3RR4dQmwyc8IC6Z0Spca9CKicDVuGE9NNdL8d6L7pUPGVeiaPGSOYXXNflIiaBABve1wTiayPDoKHyibxyvjOeqHbcNMVg/640?wx_fmt=png&from=appmsg)

![](https://mmbiz.qpic.cn/sz_mmbiz_png/NMByQQfVwffuXglpicXGVF1nHHOG6tL1o5uw2zibGggXwyfiaNq4RgauHMg6CicLKD6ukBuTRng0viaOjziayCRdYP5q7ice8qcd7KKbkia95oBHibz4/640?wx_fmt=png&from=appmsg)

我们只做了 web search 的 tool，再来加一个 tool

把之前发送邮件的 tool 拿过来

安装下依赖：

```
pnpm install @nestjs-modules/mailer
```

在 .env 加对应配置：

![](https://mmbiz.qpic.cn/sz_mmbiz_png/NMByQQfVwfcIRZ4Ol9HcHyz5iaovJoS8OOjQPOWD94ogkH40GMIHpiaKdQgd1cj1aDnEk9gvad1Ua1GXLFR9giaCqAM9HW1My95uPkLuUeavg8/640?wx_fmt=png&from=appmsg)

在 AppModule 引入这个包：

![](https://mmbiz.qpic.cn/sz_mmbiz_png/NMByQQfVwffhAwBrqrlphOogNHbZ1TdQ6HUrkN8Nv433e4vZpzVSSnRhzupSutKrs76SDjI2QTAT4Han5KOTIjyArVDgwbvvQDwicZMibCRaE/640?wx_fmt=png&from=appmsg)

```
MailerModule.forRootAsync({
  inject: [ConfigService],
useFactory: (configService: ConfigService) => ({
    transport: {
      host: configService.get<string>('MAIL_HOST'),
      port: Number(configService.get<string>('MAIL_PORT')),
      secure: configService.get<string>('MAIL_SECURE') === 'true',
      auth: {
        user: configService.get<string>('MAIL_USER'),
        pass: configService.get<string>('MAIL_PASS'),
      },
    },
    defaults: {
      from: configService.get<string>('MAIL_FROM'),
    },
  }),
}),
```

之后在 AiModule 添加一个 provider：

![](https://mmbiz.qpic.cn/mmbiz_png/NMByQQfVwfcAc0LrYm6WR8P979XIswKn6gP6JCOVjLicXicu9tELzVWiaEmPVzbb1VCvqI2EgHE3Ahv9SWdBb7QHYxibz8ocGQ7KB6jq9icMZpu4/640?wx_fmt=png&from=appmsg)

```
{
  provide: 'SEND_MAIL_TOOL',
useFactory: (mailerService: MailerService, configService: ConfigService) => {
    const sendMailArgsSchema = z.object({
      to: z
        .email()
        .describe('收件人邮箱地址，例如：someone@example.com'),
      subject: z.string().describe('邮件主题'),
      text: z.string().optional().describe('纯文本内容，可选'),
      html: z.string().optional().describe('HTML 内容，可选'),
    });

    return tool(
      async ({to, subject, text, html}: {
        to: string;
        subject: string;
        text?: string;
        html?: string;
      }) => {
        const fallbackFrom =
          configService.get<string>('MAIL_FROM')

        await mailerService.sendMail({
          to,
          subject,
          text: text ?? '（无文本内容）',
          html: html ?? `<p>${text ?? '（无 HTML 内容）'}</p>`,
          from: fallbackFrom,
        });

        return`邮件已发送到 ${to}，主题为「${subject}」`;
      },
      {
        name: 'send_mail',
        description:
          '发送电子邮件。需要提供收件人邮箱、主题，可选文本内容和 HTML 内容。',
        schema: sendMailArgsSchema,
      },
    );
  },
inject: [MailerService, ConfigService],
},
```

绑定一下：

![](https://mmbiz.qpic.cn/sz_mmbiz_png/NMByQQfVwfdxCibIE7T67Vdb478YZVPYJ5e7HYVueN6MeXp0fO7R1LCDOr6HrUunaOM27aEia8oXzS00W1NyvRKcHse5tmI2VSfdmMPBibR4o8/640?wx_fmt=png&from=appmsg)

直接调用会渲染默认 tool call 组件

![](https://mmbiz.qpic.cn/sz_mmbiz_png/NMByQQfVwfcKddMbaBQpS53EeQ2dN0F6kEicibiba9yXsibICpxibjNlQbSEBGfcXf0jVic6N9Iyake7uEGNwovic4h3SjF9ickg6XPxlz41utI0ySw/640?wx_fmt=png&from=appmsg)

![](https://mmbiz.qpic.cn/sz_mmbiz_png/NMByQQfVwfdRgWNzBlcwnnGYuIictMutV87HThIXwULkbOpKBHOD5EGN5Y9o2W90oZexgmQiaooQiaOnvbXTibM6iawpLFfe0ACvSkQ4YOg31ib3Y/640?wx_fmt=png&from=appmsg)

我们再加一个单独的组件用于渲染发送邮件的 tool

![](https://mmbiz.qpic.cn/mmbiz_png/NMByQQfVwfcMfZQ4kges72oQtkicSfa6YJKVAFzUbgiaTZkIaguCkfl9ObPkL0nFu58WxXygia05LypJ6BGlIMqgDev5Yh2SSF5NQEETxYuiaWQ/640?wx_fmt=png&from=appmsg)

试下效果：

完成。

整体总结下：

> 代码上传了课程仓库： https://github.com/QuarkGluonPlasma/ai-agent-course-code

## 总结

我们基于 AGUI 协议实现了流式渲染文本、tool call 组件的效果。

用的是 Vercel AI SDK 的 Data Stream Protocol。

后端用 LangChain 来写 Agent，我们不再手写 agent loop，直接用了 createAgent 的 api

通过 @ai-sdk/langchain 把 stream 转为基于 Data Stream Protocol 协议的 SSE 流

前端用 @ai-sdk/react 或者 @ai-sdk/vue 的 useChat 来解析这个 SSE 流，拿到 messages。

根据 message 是文本还是 tool call 做不同的渲染

文本用 streamdown 流式渲染，会解析 markdown 的表格、mermaid 流程图、代码等语法，用不同组件展示

tool call 则是自定义组件实现渲染。

对接了 AGUI 协议后，Agent 的交互体验就好很多了。
