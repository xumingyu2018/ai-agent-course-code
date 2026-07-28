import { IsEmail, IsNotEmpty, MaxLength } from 'class-validator';

// dto 用来定义数据传输对象，CreateUserDto 用来定义创建用户时需要传输的数据结构
// dto 是用来接收用户传过来的参数的
export class CreateUserDto {
  @IsNotEmpty()
  @MaxLength(50)
  name: string;

  @IsNotEmpty()
  @IsEmail()
  @MaxLength(50)
  email: string;
}
