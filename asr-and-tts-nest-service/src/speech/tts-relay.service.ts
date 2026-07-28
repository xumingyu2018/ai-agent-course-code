import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomUUID } from 'node:crypto';
import { OnEvent } from '@nestjs/event-emitter';
import { AI_TTS_STREAM_EVENT, type AiTtsStreamEvent } from '../common/stream-events';
import WebSocket from 'ws';

type ClientSession = {
  sessionId: string;
  clientWs: WebSocket;
  tencentWs?: WebSocket;
  ready: boolean;
  pendingChunks: string[];
  closed: boolean;
};

// 流式语音功能，负责将 TTS 请求转发到腾讯云，并将返回的音频流转发给客户端
@Injectable()
export class TtsRelayService implements OnModuleDestroy {
  private readonly logger = new Logger(TtsRelayService.name);
  private readonly sessions = new Map<string, ClientSession>();
  private readonly secretId: string;
  private readonly secretKey: string;
  private readonly appId: number;
  private readonly voiceType: number;

  constructor(@Inject(ConfigService) configService: ConfigService) {
    this.secretId = configService.get<string>('SECRET_ID') ?? '';
    this.secretKey = configService.get<string>('SECRET_KEY') ?? '';
    this.appId = Number(configService.get<string>('APP_ID') ?? 0);
    this.voiceType = Number(configService.get<string>('TTS_VOICE_TYPE') ?? 101001);
  }

  onModuleDestroy(): void {
    for (const session of this.sessions.values()) {
      this.closeSession(session.sessionId, 'module destroy');
    }
  }

  registerClient(clientWs: WebSocket, wantedSessionId?: string): string {
    const sessionId = wantedSessionId?.trim() || randomUUID();
    const existing = this.sessions.get(sessionId);
    if (existing) {
      this.closeSession(sessionId, 'client reconnected');
    }

    this.sessions.set(sessionId, {
      sessionId,
      clientWs,
      ready: false,
      pendingChunks: [],
      closed: false,
    });
    this.sendClientJson(clientWs, { type: 'session', sessionId });
    this.logger.log(`TTS client connected: ${sessionId}`);
    return sessionId;
  }

  unregisterClient(sessionId: string): void {
    this.closeSession(sessionId, 'client disconnected');
  }

  // 用 OnEvent 监听下 AI_TTS_STREAM_EVENT 这个事件名
  @OnEvent(AI_TTS_STREAM_EVENT)
  handleAiStreamEvent(event: AiTtsStreamEvent): void {
    const session = this.sessions.get(event.sessionId);
    if (!session) return;

    switch (event.type) {
      // 如果收到的是 start 事件，就和腾讯云的 tts 服务建立连接，然后发送一个 tts_started 的消息给前端，告诉前端可以开始播放语音了
      case 'start': {
        this.ensureTencentConnection(session);
        this.sendClientJson(session.clientWs, {
          type: 'tts_started',
          sessionId: session.sessionId,
          query: event.query,
        });
        break;
      }
      // 如果收到的是 chunk 事件，就把这段文本发送给 tts 服务
      case 'chunk': {
        const chunk = event.chunk?.trim();
        if (!chunk) return;
        // 腾讯云已 ready → 直接发 ACTION_SYNTHESIS
        // 腾讯云未 ready → 先缓存到 pendingChunks，等 ready 后再发
        if (!session.ready || !session.tencentWs || session.tencentWs.readyState !== WebSocket.OPEN) {
          session.pendingChunks.push(chunk);
          return;
        }
        this.sendTencentChunk(session, chunk);
        break;
      }
      case 'end': {
        this.flushPendingChunks(session);
        if (session.tencentWs && session.tencentWs.readyState === WebSocket.OPEN) {
          session.tencentWs.send(
            JSON.stringify({
              session_id: session.sessionId,
              action: 'ACTION_COMPLETE',
            }),
          );
        }
        break;
      }
      case 'error': {
        this.sendClientJson(session.clientWs, {
          type: 'tts_error',
          message: event.error,
        });
        this.closeSession(session.sessionId, 'ai stream error');
        break;
      }
    }
  }

  private ensureTencentConnection(session: ClientSession): void {
    if (session.tencentWs && session.tencentWs.readyState <= WebSocket.OPEN) {
      return;
    }
    if (!this.secretId || !this.secretKey || !this.appId) {
      this.sendClientJson(session.clientWs, {
        type: 'tts_error',
        message: 'TTS 凭证缺失，请检查 SECRET_ID/SECRET_KEY/APP_ID',
      });
      return;
    }

    // 用这个 url 连接上腾讯云的 tts 的 ws 服务
    const url = this.buildTencentTtsWsUrl(session.sessionId);
    const tencentWs = new WebSocket(url);
    session.tencentWs = tencentWs;
    session.ready = false;

    tencentWs.on('open', () => {
      this.logger.log(`Tencent TTS ws opened: ${session.sessionId}`);
    });

    // 监听腾讯云的 tts ws 服务返回的消息，可能是二进制音频数据，也可能是 json 消息，json 消息是用来告诉我们 tts 服务的状态，比如 ready、error、final 等
    tencentWs.on('message', (data, isBinary) => {
      if (session.closed) return;
      // 如果传过来的是二进制，就直接通过 websocket 发送给前端
      if (isBinary) {
        if (session.clientWs.readyState === WebSocket.OPEN) {
          session.clientWs.send(data, { binary: true });
        }
        return;
      }

      // 非二进制就作为 json 来处理，用 JSON.parse 处理下，根据不同的类型，给前端返回不同的 json，比如 tts_error、tts_final 等
      const raw = data.toString();
      let msg: Record<string, unknown> | undefined;
      try {
        msg = JSON.parse(raw) as Record<string, unknown>;
      } catch {
        return;
      }

      if (Number(msg.ready) === 1) {
        session.ready = true;
        this.flushPendingChunks(session);
      }

      if (Number(msg.code) && Number(msg.code) !== 0) {
        this.sendClientJson(session.clientWs, {
          type: 'tts_error',
          message: String(msg.message ?? 'Tencent TTS error'),
          code: Number(msg.code),
        });
        this.closeSession(session.sessionId, 'tencent error');
        return;
      }

      if (Number(msg.final) === 1) {
        this.sendClientJson(session.clientWs, { type: 'tts_final' });
      }
    });

    tencentWs.on('error', (error) => {
      this.sendClientJson(session.clientWs, {
        type: 'tts_error',
        message: `Tencent ws error: ${error.message}`,
      });
    });

    tencentWs.on('close', () => {
      session.tencentWs = undefined;
      session.ready = false;
    });
  }

  // 把 pendingChunks 里的文本都发送给腾讯云的 tts 服务
  private flushPendingChunks(session: ClientSession): void {
    if (!session.ready || !session.tencentWs || session.tencentWs.readyState !== WebSocket.OPEN) {
      return;
    }
    while (session.pendingChunks.length > 0) {
      const chunk = session.pendingChunks.shift();
      if (!chunk) continue;
      this.sendTencentChunk(session, chunk);
    }
  }

  private sendTencentChunk(session: ClientSession, text: string): void {
    if (!session.tencentWs || session.tencentWs.readyState !== WebSocket.OPEN) {
      session.pendingChunks.push(text);
      return;
    }

    // 发送给腾讯云的 tts 服务发送合成语音指令，action为"ACTION_SYNTHESIS"
    session.tencentWs.send(
      JSON.stringify({
        session_id: session.sessionId,
        message_id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        action: 'ACTION_SYNTHESIS',
        data: text,
      }),
    );
  }

  private closeSession(sessionId: string, reason: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.closed = true;

    if (session.tencentWs && session.tencentWs.readyState < WebSocket.CLOSING) {
      session.tencentWs.close();
    }
    if (session.clientWs.readyState < WebSocket.CLOSING) {
      this.sendClientJson(session.clientWs, { type: 'tts_closed', reason });
      session.clientWs.close();
    }
    this.sessions.delete(sessionId);
    this.logger.log(`TTS session closed: ${sessionId}, reason: ${reason}`);
  }

  private sendClientJson(clientWs: WebSocket, payload: Record<string, unknown>): void {
    if (clientWs.readyState !== WebSocket.OPEN) return;
    clientWs.send(JSON.stringify(payload));
  }

  // 连接腾讯云的 streaming tts 接口来做语音合成，建立 WebSocket 连接时需要签名，签名算法参考腾讯云官方文档
  private buildTencentTtsWsUrl(sessionId: string): string {
    const now = Math.floor(Date.now() / 1000);
    const params: Record<string, string | number> = {
      Action: 'TextToStreamAudioWSv2',
      AppId: this.appId,
      Codec: 'mp3',
      Expired: now + 3600,
      SampleRate: 16000,
      SecretId: this.secretId,
      SessionId: sessionId,
      Speed: 0,
      Timestamp: now,
      VoiceType: this.voiceType,
      Volume: 5,
    };

    const signStr = Object.keys(params)
      .sort()
      .map((k) => `${k}=${params[k]}`)
      .join('&');
    const rawStr = `GETtts.cloud.tencent.com/stream_wsv2?${signStr}`;
    const signature = createHmac('sha1', this.secretKey).update(rawStr).digest('base64');
    const searchParams = new URLSearchParams({
      ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
      Signature: signature,
    });

    return `wss://tts.cloud.tencent.com/stream_wsv2?${searchParams.toString()}`;
  }
}
