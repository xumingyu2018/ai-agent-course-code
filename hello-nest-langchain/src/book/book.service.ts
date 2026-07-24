import { Inject, Injectable } from '@nestjs/common';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';

@Injectable()
export class BookService {

  // 属性注入
  @Inject('BOOK_REPOSITORY')
  private readonly bookRepository: any;

  create(createBookDto: CreateBookDto) {
    return 'This action adds a new book';
  }

  findAll() {
    // return `This action returns all book`;
    return this.bookRepository.findAll();
  }

  findOne(id: number) {
    return `This action returns a #${id} book`;
  }

  update(id: number, updateBookDto: UpdateBookDto) {
    return `This action updates a #${id} book`;
  }

  remove(id: number) {
    return `This action removes a #${id} book`;
  }
}
