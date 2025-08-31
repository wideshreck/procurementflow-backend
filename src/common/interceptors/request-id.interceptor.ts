import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { Observable, tap } from 'rxjs';

@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<FastifyRequest & { id?: string }>();
    const res = context.switchToHttp().getResponse<FastifyReply>();

    const requestId = req.id || req.headers['x-request-id'];
    if (requestId) {
      res.header('x-request-id', String(requestId));
    }
    return next.handle().pipe(tap(() => {}));
  }
}
