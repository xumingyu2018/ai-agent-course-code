import { Inject, Injectable } from '@nestjs/common';
import type * as tencentcloud from 'tencentcloud-sdk-nodejs';

type UploadedAudio = {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
};

type AsrClient = InstanceType<typeof tencentcloud.asr.v20190614.Client>;

@Injectable()
export class SpeechService {
  constructor(@Inject('ASR_CLIENT') private readonly asrClient: AsrClient) {}

  async recognizeBySentence(file: UploadedAudio): Promise<string> {
    // 把传过来的 buffer 转成 base64 字符串，用 asrClient 的 SentenceRecognition 方法来识别成文字返回
    const audioBase64 = file.buffer.toString('base64');

    // 语音转文本功能
    const result = await this.asrClient.SentenceRecognition({
      EngSerViceType: '16k_zh',
      SourceType: 1,
      Data: audioBase64,
      DataLen: file.buffer.length,
      VoiceFormat: 'ogg-opus',
    });

    return result.Result ?? '';
  }
}
