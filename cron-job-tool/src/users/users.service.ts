import { Inject, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { EntityManager } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  @Inject(EntityManager) // 注入了 EntityManager 来操作 User 的 entity 实体类
  entityManager: EntityManager;

  create(createUserDto: CreateUserDto) {
    // 这里 dto 是用来接收用户传过来的参数的，只接受 name、email 就好了，id 是自动生成的，createdAt、updatedAt 也会自动更新值
    return this.entityManager.save(User, createUserDto);
  }

  findAll() {
    return this.entityManager.find(User);
  }

  findOne(id: number) {
    return this.entityManager.findOne(User, { where: { id } });
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    return this.entityManager.update(User, id, updateUserDto);
  }

  remove(id: number) {
    return this.entityManager.delete(User, id);
  }
}
