import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import multer from 'fastify-multer';

export function FastifyFileInterceptor(fieldName: string, options: any): any {
  @Injectable()
  class MixinInterceptor implements NestInterceptor {
    protected multer: any;

    constructor() {
      this.multer = multer(options);
    }

    async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
      const ctx = context.switchToHttp();
      const req = ctx.getRequest();
      const res = ctx.getResponse();

      await new Promise<void>((resolve, reject) => {
        this.multer.single(fieldName)(req, res, (err: any) => {
          if (err) {
            return reject(err);
          }
          resolve();
        });
      });

      return next.handle();
    }
  }

  const Interceptor = MixinInterceptor;
  return Interceptor;
}
