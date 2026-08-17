import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  // nestFactory.create(AppModule) 创建一个 Nest 应用程序实例
  const app = await NestFactory.create(AppModule);
  // transform: true 表示启用自动类型转换，将请求参数转换为 DTO 中定义的类型
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true
    }),
  );
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
