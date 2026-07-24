import { Inject, Injectable } from '@nestjs/common';
import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import type { Runnable } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';

@Injectable()
export class AiService {
  private readonly chain: Runnable;

  constructor(
    // @Inject(ConfigService) configService: ConfigService,
    @Inject('CHAT_MODEL') model: ChatOpenAI
  ) {
    const prompt = PromptTemplate.fromTemplate(
      '请回答以下问题：\n\n{query}',
    );
    // const model = new ChatOpenAI({
    //   temperature: 0.7,
    //   model: configService.get('MODEL_NAME'),
    //   apiKey: configService.get('OPENAI_API_KEY'),
    //   configuration: {
    //     baseURL: configService.get('OPENAI_BASE_URL')
    //   },
    // });
    this.chain = prompt.pipe(model).pipe(new StringOutputParser());
  }

  // runChain 方法基于传入的参数调用 chain
  async runChain(query: string): Promise<string> {
    return this.chain.invoke({ query });
  }

  // 使用SSE流式输出的方式调用chain，这里用到了 js 的生成器语法，也就是方法名那里标个*，然后 yield 不断异步返回内容
  // 为什么要用 yield 呢？yield 是生成器的关键字，它可以让函数在执行过程中暂停，并返回一个值，然后在下一次调用时从暂停的地方继续执行。这样就可以实现流式输出的效果。
  async *streamChain(query: string): AsyncGenerator<string> {
    const stream = await this.chain.stream({ query });
    for await (const chunk of stream) {
      yield chunk;
    }
  }
}
