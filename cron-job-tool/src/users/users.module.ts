import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

// 使用 nest g resource users --no-spec 创建一个users模块，包含users.service.ts、users.controller.ts、users.module.ts、dto文件夹和entities文件夹
@Module({
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService], // 导出 UsersService 以便在其他模块中可以注入这个 service
})
export class UsersModule {}
