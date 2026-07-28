import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { WebSocketServer } from 'ws';
import { TtsRelayService } from './speech/tts-relay.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const ttsRelayService = app.get(TtsRelayService);
  const server = app.getHttpServer(); // 复用 NestJS 的 HTTP server

  // 创建 websocketf 服务，让前端可以通过 websocket 连接到 /speech/tts/ws 来接收 tts 的流式语音数据
  const ttsWss = new WebSocketServer({
    server,
    path: '/speech/tts/ws',
  });

  ttsWss.on('connection', (socket, request) => {
    const reqUrl = new URL(request.url ?? '', 'http://localhost');
    const wantedSessionId = reqUrl.searchParams.get('sessionId') ?? undefined;
    // 把 socket 注册到 ttsRelayService 里，这样就可以在 ttsRelayService 里通过 sessionId 来找到这个 socket，然后把 tts 的流式语音数据发送给前端
    const sessionId = ttsRelayService.registerClient(socket, wantedSessionId);

    socket.on('close', () => {
      ttsRelayService.unregisterClient(sessionId);
    });
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
