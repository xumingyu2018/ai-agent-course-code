import { Module } from '@nestjs/common';
import { BookService } from './book.service';
import { BookController } from './book.controller';

@Module({
  controllers: [BookController],
  providers: [
    BookService,
    {
      provide: 'BOOK_REPOSITORY',
      useFactory() { // useFactory 函数返回一个对象，它也可以作为 provider 来用
        // 内存 mock 仓库，适合测试，无需外部依赖
        const books: { id: number; title: string }[] = [
          { id: 1, title: 'Book 1' },
          { id: 2, title: 'Book 2' },
          { id: 3, title: 'Book 3' },
        ];
        return {
          findAll: () => [...books]
        };
      },
    },
  ],
})
export class BookModule {}
