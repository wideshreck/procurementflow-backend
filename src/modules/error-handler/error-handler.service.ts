import { Injectable, Logger, HttpException } from '@nestjs/common';
import { ServiceException } from './error.types';

@Injectable()
export class ErrorHandlerService {
  private readonly logger = new Logger(ErrorHandlerService.name);

  handle(error: Error) {
    if (error instanceof ServiceException) {
      this.logger.error(`ServiceException: ${error.message}`, error.stack);
      throw new HttpException(error.message, error.statusCode);
    }

    this.logger.error(`UnhandledException: ${error.message}`, error.stack);
    throw new HttpException('Internal server error', 500);
  }
}