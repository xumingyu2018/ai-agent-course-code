import { BadRequestException, Body, Controller, Get, Post, Query, Res, Sse } from '@nestjs/common';
import type { Response } from 'express';
import { AiService } from './ai.service';
import { pipeUIMessageStreamToResponse, UIMessage } from 'ai';

@Controller('ai')
export class AiController {
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
      throw new BadRequestException('Invalid JSON');
    }

    const stream = await this.aiService.stream(body.messages);
    // pipeUIMessageStreamToResponse 会把 stream 转成 SSE 的 Data Stream Protocol 的协议数据（data: {"type":"text-delta",...} 这样的 SSE 帧）返回给前端
    // 这里没有用 Nest 的 @Sse() 装饰器 —— 因为 @Sse() 走 RxJS Observable + 自定义事件格式，而这里要输出 AI SDK 的专有协议格式，直接 pipe 更合适
    pipeUIMessageStreamToResponse({ response: res, stream });
  }
}
