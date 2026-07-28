import { Inject, Injectable } from '@nestjs/common';
import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import type { Runnable } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AI_TTS_STREAM_EVENT, type AiTtsStreamEvent } from '../common/stream-events';

@Injectable()
export class AiService {
  private readonly chain: Runnable;

  constructor(
    @Inject('CHAT_MODEL') model: ChatOpenAI,
    private readonly eventEmitter: EventEmitter2,
  ) {
    const prompt = PromptTemplate.fromTemplate('请回答以下问题：\n\n{query}');
    this.chain = prompt.pipe(model).pipe(new StringOutputParser());
  }

  async *streamChain(query: string, ttsSessionId?: string): AsyncGenerator<string> {
    try {
      const stream = await this.chain.stream({ query });
      for await (const chunk of stream) {
        // 每个 chunk 在 yield 给 SSE 之前，同时 emit 一个 chunk 事件（携带 sessionId），文字流"分叉"给 TTS 做流式语音功能
        if (ttsSessionId) {
          const event: AiTtsStreamEvent = {
            type: 'chunk',
            sessionId: ttsSessionId,
            chunk,
          };
          // 在 SSE 接口生成流式文本的时候，通过事件的方式同时推送给 ws 接口，这里用腾讯云的流式语音接口生成语音数据后，推送给前端代码来播放语音
          // 这里 emit 这个事件的时候就会自动调用 tts-relay.service.ts 里的 handleAiStreamEvent 方法，来把这个 chunk 推送给前端
          this.eventEmitter.emit(AI_TTS_STREAM_EVENT, event);
        }
        yield chunk;
      }
      if (ttsSessionId) {
        const endEvent: AiTtsStreamEvent = { type: 'end', sessionId: ttsSessionId };
        this.eventEmitter.emit(AI_TTS_STREAM_EVENT, endEvent);
      }
    } catch (error) {
      if (ttsSessionId) {
        const errorEvent: AiTtsStreamEvent = {
          type: 'error',
          sessionId: ttsSessionId,
          error: error instanceof Error ? error.message : String(error),
        };
        this.eventEmitter.emit(AI_TTS_STREAM_EVENT, errorEvent);
      }
      throw error;
    }
  }
}
