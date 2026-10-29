import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { FastifyRequest } from 'fastify';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: Record<string, unknown>;
  requestId?: string;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const requestId = request.headers['x-request-id'] as string | undefined;

    return next.handle().pipe(
      map((response) => {
        // Allow controllers to return pre-formatted { data, meta } shapes
        if (
          response &&
          typeof response === 'object' &&
          'data' in response &&
          !('success' in response)
        ) {
          return {
            success: true,
            data: response.data,
            meta: response.meta,
            requestId,
          };
        }
        return {
          success: true,
          data: response,
          requestId,
        };
      }),
    );
  }
}
