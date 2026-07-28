import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity() //  @Entity 标识这个 class 是 entity, TypeORM 会根据这个类自动创建 User 数据库表
export class User {
  @PrimaryGeneratedColumn() //  @PrimaryGeneratedColumn 标识这个字段是主键，并且是自增长的
  id: number;

  @Column({ //  @Column 标识这个字段是数据库表中的一列
    length: 50,
  })
  name: string;

  @Column({
    length: 50,
  })
  email: string;

  @CreateDateColumn({ // @CreateDateColumn 标识这个字段是创建时间，TypeORM 会自动在插入数据时设置这个字段的值
    type: 'timestamp',
  })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'timestamp',
  })
  updatedAt: Date;
}
