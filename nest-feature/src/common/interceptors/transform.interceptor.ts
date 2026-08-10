import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map, tap } from 'rxjs';
import { ApiResponse } from '../interfaces/api-response.interface';

// TransformInterceptor：打印请求、响应日志，转换响应格式
@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  // intercept 拦截器方法，用于在请求处理前后执行自定义逻辑。它接收当前的执行上下文和下一个处理程序，并返回一个 Observable。
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T>> {
    const request = context.switchToHttp().getRequest<{
      method: string;
      url: string;
    }>();
    const { method, url } = request;
    const startTime = Date.now();
    const requestTime = new Date().toISOString();

    console.log(`[请求] ${requestTime} ${method} ${url}`);

    // 使用 RxJS 的 map 操作符来转换响应数据的格式，并使用 tap 操作符来记录响应时间日志
    return next.handle().pipe(
      map((data) => ({
        code: 200,
        data,
        message: '成功',
      })),
      tap(() => {
        const duration = Date.now() - startTime;
        console.log(
          `[响应] ${new Date().toISOString()} ${method} ${url} 耗时 ${duration}ms`,
        );
      }),
    );
  }
}
