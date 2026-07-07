import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

/** Error envelope: every failure is emitted as `{ error: {...} }`. */
export interface ErrorEnvelope {
  error: {
    statusCode: number;
    message: string | string[];
    error: string;
    path: string;
    timestamp: string;
  };
}

/**
 * Global exception filter. Formats every thrown error into the `{ error }`
 * envelope so clients get one consistent error shape. Controllers/services throw
 * typed HttpExceptions (e.g. NotFoundException -> 404); anything else becomes a
 * 500 without leaking internals. Only a short summary (status + path + message)
 * is logged — never request bodies or raw document payloads.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let error = 'InternalServerError';

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      error = exception.name;
      const responseBody = exception.getResponse();
      if (typeof responseBody === 'string') {
        message = responseBody;
      } else if (responseBody && typeof responseBody === 'object') {
        const body = responseBody as {
          message?: string | string[];
          error?: string;
        };
        message = body.message ?? message;
        error = body.error ?? error;
      }
    }

    const envelope: ErrorEnvelope = {
      error: {
        statusCode,
        message,
        error,
        path: request.url,
        timestamp: new Date().toISOString(),
      },
    };

    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(`${request.method} ${request.url} -> ${statusCode}`);
    } else {
      this.logger.warn(`${request.method} ${request.url} -> ${statusCode}`);
    }

    response.status(statusCode).json(envelope);
  }
}
