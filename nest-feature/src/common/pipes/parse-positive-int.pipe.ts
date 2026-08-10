import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';

// ParsePositiveIntPipe：将字符串转为正整数；非法值抛 400
@Injectable()
export class ParsePositiveIntPipe implements PipeTransform<string, number> {
  transform(value: string, metadata: ArgumentMetadata): number {
    const parsed = Number.parseInt(value, 10);

    if (
      Number.isNaN(parsed) ||
      parsed <= 0 ||
      !Number.isInteger(parsed) ||
      String(parsed) !== value
    ) {
      throw new BadRequestException(
        `参数 ${metadata.data ?? 'id'} 必须是正整数，当前值: ${value}`,
      );
    }

    return parsed;
  }
}
