import { Controller, Get, Query, Sse } from '@nestjs/common';
import { from, map, Observable } from 'rxjs';
import { AiService } from './ai.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AI_TTS_STREAM_EVENT, type AiTtsStreamEvent } from '../common/stream-events';

@Controller('ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // SSE 接口，返回流式的 AI 回答文本，同时通过事件的方式把流式文本推送给 TTS （ttsRelayService）做流式语音
  @Sse('chat/stream')
  chatStream(
    @Query('query') query: string,
    @Query('ttsSessionId') ttsSessionId?: string,
  ): Observable<{ data: string }> {
    const sessionId = ttsSessionId?.trim();
    if (sessionId) {
      // 如果请求带了 ttsSessionId，先 emit 触发 start 事件（触发中继服务 ttsRelayService 里 handleAiStreamEvent 方法），告诉中继服务和腾讯云的 tts 服务建立连接，然后发送一个 tts_started 的消息给前端，告诉前端可以开始播放语音了
      const startEvent: AiTtsStreamEvent = { type: 'start', sessionId, query };
      this.eventEmitter.emit(AI_TTS_STREAM_EVENT, startEvent);
    }

    return from(this.aiService.streamChain(query, sessionId)).pipe(
      map((chunk) => ({ data: chunk })),
    );
  }
}
