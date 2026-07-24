import { Controller, Get, Query, Sse } from '@nestjs/common';
import { from, map, Observable } from 'rxjs';
import { AiService } from './ai.service';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get('chat')
  async chat(@Query('query') query: string) {
    const answer = await this.aiService.runChain(query);
    return { answer };
  }

  // 声明接口是 sse 的，然后创建一个 Observable，用 rxjs 的 Observable 返回流式数据
  @Sse('chat/stream')
  chatStream(@Query('query') query: string): Observable<{ data: string }> {
    // from 将异步生成器转换为 Observable，map 将每个 chunk 转换成 { data: chunk } 形式
    return from(this.aiService.streamChain(query)).pipe(
      map((chunk) => ({ data: chunk }))
    );
  }
}
