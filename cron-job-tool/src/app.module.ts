import { Inject, Module, OnApplicationBootstrap } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AiModule } from './ai/ai.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailerModule } from '@nestjs-modules/mailer';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { User } from './users/entities/user.entity';
import { Job } from './job/entities/job.entity';
import { CronExpression, ScheduleModule, SchedulerRegistry } from '@nestjs/schedule';
import { JobModule } from './job/job.module';
import { CronJob } from 'cron';

@Module({
  imports: [
    // 引入定时任务模块
    ScheduleModule.forRoot(),
    // TypeOrm 为了让 NestJS 能够连接数据库，使用 TypeORM 作为 ORM 框架
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: 'admin',
      database: 'hello',
      synchronize: true, // synchronize: true 会自动创建数据库表
      connectorPackage: 'mysql2', // 使用 mysql2 作为数据库连接器
      logging: true,
      entities: [User, Job], // 指定实体类，TypeORM 会根据这些实体类创建数据库表，把对数据库表的操作转换为对对象的操作
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
    }),
    AiModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // AppModule 中配置 MailerModule 发送邮箱，使用 forRootAsync 方法异步加载配置
    MailerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        transport: {
          host: configService.get<string>('MAIL_HOST'),
          port: Number(configService.get<string>('MAIL_PORT')),
          secure: configService.get<string>('MAIL_SECURE') === 'true',
          auth: {
            user: configService.get<string>('MAIL_USER'),
            pass: configService.get<string>('MAIL_PASS'),
          },
        },
        defaults: {
          from: configService.get<string>('MAIL_FROM'),
        },
      }),
    }),
    UsersModule,
    JobModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})

// 定时任务测试代码
// 实现了 OnApplicationBootstrap 就可以在 onApplicationBootstrap 里加一些应用启动时执行的逻辑
export class AppModule implements OnApplicationBootstrap {
  @Inject(SchedulerRegistry) // 注入 SchedulerRegistry 来管理定时任务 CronJob，如添加、删除、获取定时任务等
  schedulerRegistry: SchedulerRegistry;

  async onApplicationBootstrap() {
    // CronExpression.EVERY_SECOND 表示每秒执行一次，CronJob 的回调函数里可以写定时任务的逻辑
  //   const job = new CronJob(CronExpression.EVERY_SECOND, () => {
  //     console.log('run job');
  //   });
  //   this.schedulerRegistry.addCronJob('job1', job);
  //   job.start();
  //   setTimeout(() => {
  //     this.schedulerRegistry.deleteCronJob('job1');
  //   }, 5000);

  //   const intervalRef = setInterval(() => {
  //     console.log('run interval job');
  //   }, 1000);
  //   this.schedulerRegistry.addInterval('interval1', intervalRef);
  //   setTimeout(() => {
  //     this.schedulerRegistry.deleteInterval('interval1');
  //   }, 5000);

  //   const timeoutRef = setTimeout(() => {
  //     console.log('run timeout job');
  //   }, 3000);
  //   this.schedulerRegistry.addTimeout('timeout1', timeoutRef);
  //   setTimeout(() => {
  //     this.schedulerRegistry.deleteTimeout('timeout1');
  //   }, 5000);
  }
}

