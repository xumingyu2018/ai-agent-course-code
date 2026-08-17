import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Configuration,
  GenerationResult,
  MultiModalConversation,
} from 'dashscope-sdk-official';
import { ImageDto } from './dto/image.dto';
import { ImageRecord } from './image-record.interface';
import { ImageStoreService } from './image-store.service';
import { OssService } from './oss.service';

interface WanImageOptions {
  size?: string;
  promptExtend: boolean;
  watermark: boolean;
}

interface MultiModalConversationInternal {
  syncRequest(data: Record<string, unknown>): Promise<GenerationResult>;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly client: MultiModalConversation;

  constructor(
    private readonly config: ConfigService,
    private readonly ossService: OssService,
    private readonly imageStore: ImageStoreService,
  ) {
    this.client = new MultiModalConversation(
      new Configuration({
        apiKey: this.config.getOrThrow<string>('OPENAI_API_KEY'),
      }),
    );
  }

  async createImage(dto: ImageDto): Promise<ImageRecord> {
    const options: WanImageOptions = {
      size: dto.size,
      promptExtend: dto.promptExtend ?? true,
      watermark: dto.watermark ?? false,
    };
    const inputImageUrl = dto.imageUrl;
    const resultUrl = inputImageUrl
    // 有图走编辑模型
      ? await this.generateByEdit(
          [
            { text: dto.prompt },
            { image: this.ossService.resolveReadableUrl(inputImageUrl) }, // 换成带有签名的可读 URL，避免 DashScope 无法访问私有 OSS 文件
          ],
          options,
        )
        // 没图走文生图模型
      : await this.generateByText([{ text: dto.prompt }], options);

    const url = await this.ossService.uploadFromUrl(resultUrl);

    return this.imageStore.add({
      prompt: dto.prompt,
      url,
      inputImageUrl,
      mode: inputImageUrl ? 'edit' : 'text',
      size: options.size ?? (inputImageUrl ? '1K' : '1280*1280'),
    });
  }

  listImages(): ImageRecord[] {
    return this.imageStore.list();
  }

  deleteImage(id: string): void {
    this.imageStore.remove(id);
  }

  getUploadSignature(ext?: string) {
    // 生成前端直传OSS的签名
    return this.ossService.createUploadPolicy(ext);
  }

  private async generateByEdit(
    content: Array<{ text?: string; image?: string }>,
    options: WanImageOptions,
  ): Promise<string> {
    const raw = await this.wanCall({
      model: 'wan2.6-image',
      messages: [{ role: 'user', content }],
      prompt_extend: options.promptExtend,
      watermark: options.watermark,
      n: 1,
      enable_interleave: false,
      size: options.size ?? '1K',
    });

    const result = raw as GenerationResult;
    this.assertSuccess(result);

    const resultUrl = this.extractImageUrl(result);
    if (!resultUrl) {
      throw new BadRequestException(
        `No image URL in DashScope response: ${JSON.stringify(result)}`,
      );
    }

    return resultUrl;
  }

  private async generateByText(
    content: Array<{ text?: string; image?: string }>,
    options: WanImageOptions,
  ): Promise<string> {
    const startedAt = Date.now();
    this.logger.log('text-to-image started (wan2.6-t2i sync)');

    const raw = await this.wanCall({
      model: 'wan2.6-t2i',
      messages: [{ role: 'user', content }],
      prompt_extend: options.promptExtend,
      watermark: options.watermark,
      n: 1,
      size: options.size ?? '1280*1280',
    });

    const result = raw as GenerationResult;
    this.assertSuccess(result);

    const resultUrl = this.extractImageUrl(result);
    if (!resultUrl) {
      throw new BadRequestException(
        `No image URL in DashScope response: ${JSON.stringify(result)}`,
      );
    }

    this.logger.log(
      `text-to-image finished in ${Date.now() - startedAt}ms`,
    );

    return resultUrl;
  }

  private extractImageUrl(result: GenerationResult): string | undefined {
    const content = result.output?.choices?.[0]?.message?.content;
    if (!Array.isArray(content)) {
      return undefined;
    }

    for (const item of content) {
      if (item.image) {
        return item.image;
      }
    }

    return undefined;
  }

  private assertSuccess(result: GenerationResult): void {
    if (result.status_code !== 200 || result.code) {
      throw new BadRequestException(
        result.message ?? `DashScope request failed: ${result.status_code}`,
      );
    }
  }

  private wanCall(options: {
    model: string;
    messages: Array<{
      role: 'user' | 'assistant' | 'system';
      content: Array<{ text?: string; image?: string }>;
    }>;
    [key: string]: unknown;
  }): Promise<GenerationResult> {
    const { model, messages, ...rest } = options;
    return (
      this.client as unknown as MultiModalConversationInternal
    ).syncRequest({
      model,
      input: { messages },
      parameters: { ...rest, stream: false },
    });
  }
}
