import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from '../../auth/auth.service';
import { JwtPayload } from '../interfaces/api-response.interface';

// AuthGuard：校验 Bearer Token，并将当前用户信息挂到 request.user，token 有效且有权限就放行，否则返回阻止访问返回无权限 403
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  // canActivate 方法用于检查请求是否被允许访问。它从请求头中提取 Bearer Token，验证其有效性，并根据用户角色和请求参数决定是否允许访问。
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      headers: { authorization?: string };
      params: { id?: string };
      user?: JwtPayload;
    }>();

    const token = this.extractToken(request.headers.authorization);
    if (!token) {
      throw new UnauthorizedException('请先登录，携带合法 Token');
    }

    const user = this.authService.validateToken(token);
    if (!user) {
      throw new UnauthorizedException('Token 无效或已过期');
    }

    request.user = user;

    const targetId = request.params.id;
    if (targetId !== undefined) {
      const id = Number.parseInt(targetId, 10);
      if (user.role !== 'admin' && user.id !== id) {
        throw new ForbiddenException('无权访问其他用户信息');
      }
    }

    return true;
  }

  // 提取 Bearer Token
  private extractToken(authorization?: string): string | null {
    if (!authorization) {
      return null;
    }

    const [type, token] = authorization.split(' ');
    if (type !== 'Bearer' || !token) {
      return null;
    }

    return token;
  }
}
