import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ZodValidationException } from 'nestjs-zod';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest();
    const res = ctx.getResponse();

    const requestId: string | undefined =
      (req?.id as string | undefined) ?? (req?.headers?.['x-request-id'] as string | undefined);

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = (exception as any)?.message ?? 'Internal server error';

    if (exception instanceof ZodValidationException) {
      status = HttpStatus.BAD_REQUEST;
      message = 'Validation failed';
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = (exception.getResponse() as any)?.message ?? exception.message;
    }

    const path = req?.url ?? '';
    const method = req?.method ?? '';

    const body: Record<string, any> = {
      statusCode: status,
      message,
      error:
        exception instanceof HttpException
          ? ((exception.getResponse() as any)?.error ?? exception.name)
          : ((exception as any)?.name ?? 'Error'),
      path,
      method,
      timestamp: new Date().toISOString(),
    };

    if (exception instanceof ZodValidationException) {
      body.errors = exception
        .getZodError()
        .issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
    }

    if (requestId) body.requestId = requestId;

    // logging: dev'de stack detaylı, prod'da sade
    if (process.env.NODE_ENV !== 'production') {
      this.logger.error(`${method} ${path} → ${status} (${message})`, (exception as any)?.stack);
    } else {
      this.logger.error(`${method} ${path} → ${status} (${message})`);
    }

    // mümkün olduğunca JSON döndür
    res.status(status).send(body);
  }
}
