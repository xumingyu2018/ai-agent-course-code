import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BookModule } from './book/book.module';
import { AiModule } from './ai/ai.module';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

@Module({
  imports: [
    // 使用 ServeStaticModule 可以让 nest 服务支持静态 html 文件访问
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
    }),
    BookModule, // 根模块 AppModule 引入 BookModule，这样 BookController 里的路由就会生效了
    AiModule,
    // 使用 ConfigModule 来读取 .env 文件里的配置，isGlobal: true 表示全局可用
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
  ],
  controllers: [AppController],
  providers: [AppService], // 也可以使用 useFactory 来创建 AppService 的实例
})
export class AppModule {}
