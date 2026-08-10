import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

export interface JwtTestPayload {
  sub: number;
  username: string;
}

@Injectable()
export class JwtTestService {
  constructor(private readonly jwtService: JwtService) {}

  // 生成 JWT Token
  sign(payload: JwtTestPayload): string {
    return this.jwtService.sign(payload);
  }

  // 校验 JWT Token
  verify(token: string): JwtTestPayload {
    try {
      return this.jwtService.verify<JwtTestPayload>(token);
    } catch {
      throw new UnauthorizedException('Token 无效或已过期');
    }
  }
}
