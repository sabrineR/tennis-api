import { Catch, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import type { Response } from 'express';
import { AppError } from '../../errors/app.error.ts';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception instanceof AppError && exception.code === 'PLAYER_NOT_FOUND') {
      response.status(HttpStatus.NOT_FOUND).json({
        statusCode: HttpStatus.NOT_FOUND,
        code: exception.code,
        message: exception.message,
      });
      return;
    }

    if (exception instanceof HttpException && exception.getStatus() < 500) {
      const statusCode = exception.getStatus();
      const body = exception.getResponse();
      let message: string | string[] = exception.message;
      if (typeof body === 'string') {
        message = body;
      } else if ('message' in body) {
        const candidate: unknown = body.message;
        if (typeof candidate === 'string') {
          message = candidate;
        } else if (Array.isArray(candidate) && candidate.every((item) => typeof item === 'string')) {
          message = candidate as string[];
        }
      }
      response.status(statusCode).json({ statusCode, code: 'HTTP_ERROR', message });
      return;
    }

    // Do not log SQL, connection options, request bodies, or raw error messages.
    this.logger.error({
      event: 'Unhandled HTTP exception',
      errorType: exception instanceof Error ? exception.name : 'UnknownError',
      causeType:
        exception instanceof Error && exception.cause instanceof Error
          ? exception.cause.name
          : undefined,
    });
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Internal server error',
    });
  }
}
