import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Message } from './message.entity';

@Entity('conversations')
export class Conversation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ type: 'text', nullable: true })
  title: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  // ManyToOne 表示多对一关系，Conversation 多个实例可以关联到同一个 User 实例
  @ManyToOne(() => User, (user) => user.conversations, { onDelete: 'CASCADE' })
  // @JoinColumn 装饰器用于指定外键列的名称
  @JoinColumn({ name: 'user_id' })
  user: User;

  // OneToMany 表示一对多关系，Conversation 一个实例可以关联多个 Message 实例
  @OneToMany(() => Message, (message) => message.conversation)
  messages: Message[];
}
