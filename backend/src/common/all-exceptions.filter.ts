import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AppException } from './app.exception';
import { ErrorCode } from './error-code';

/** Error envelope: every failure is emitted as `{ error: {...} }`. */
export interface ErrorEnvelope {
  error: {
    statusCode: number;
    /** Stable, catalogued code the client branches on (see {@link ErrorCode}). */
    code: string;
    message: string | string[];
    error: string;
    /** Structured extras, e.g. per-field validation errors. Omitted when absent. */
    details?: unknown;
    path: string;
    timestamp: string;
  };
}

/**
 * Global exception filter. Formats every thrown error into the `{ error }`
 * envelope with a stable `code` (see {@link ErrorCode}) the client branches on —
 * the human `message` may change without breaking callers. Domain code throws
 * {@link AppException}; validation failures arrive as AppException(VALIDATION_ERROR)
 * from the pipe factory; anything else becomes a 500 (INTERNAL_ERROR) without
 * leaking internals. Only a short summary (status + path + code) is logged —
 * never request bodies or raw document payloads.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let code: ErrorCode = ErrorCode.INTERNAL_ERROR;
    let message: string | string[] = 'Internal server error';
    let details: unknown;

    if (exception instanceof AppException) {
      statusCode = exception.getStatus();
      code = exception.code;
      details = exception.details;
      message = extractMessage(exception, message);
    } else if (exception instanceof HttpException) {
      // A framework-raised HttpException (e.g. an unmatched route): preserve its
      // real status, tag it as a generic client/server code.
      statusCode = exception.getStatus();
      code =
        statusCode >= HttpStatus.INTERNAL_SERVER_ERROR
          ? ErrorCode.INTERNAL_ERROR
          : ErrorCode.CLIENT_ERROR;
      message = extractMessage(exception, message);
    }

    const envelope: ErrorEnvelope = {
      error: {
        statusCode,
        code,
        message,
        // The HTTP reason phrase (e.g. "Not Found") — never the internal
        // exception class name. `code` is the machine-readable contract.
        error: reasonPhrase(statusCode),
        ...(details === undefined ? {} : { details }),
        path: request.url,
        timestamp: new Date().toISOString(),
      },
    };

    const summary = `${request.method} ${request.url} -> ${statusCode} [${code}]`;
    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      // Log the underlying error (stack/message) so unexpected 5xx are
      // debuggable server-side. The response body stays the generic envelope;
      // request bodies and document payloads are never logged.
      const detail =
        exception instanceof Error
          ? (exception.stack ?? exception.message)
          : String(exception);
      this.logger.error(summary, detail);
    } else {
      this.logger.warn(summary);
    }

    response.status(statusCode).json(envelope);
  }
}

/** Standard HTTP reason phrase for a status; a generic fallback for the rest. */
function reasonPhrase(status: number): string {
  const phrases: Record<number, string> = {
    [HttpStatus.BAD_REQUEST]: 'Bad Request',
    [HttpStatus.NOT_FOUND]: 'Not Found',
    [HttpStatus.CONFLICT]: 'Conflict',
    [HttpStatus.UNPROCESSABLE_ENTITY]: 'Unprocessable Entity',
    [HttpStatus.INTERNAL_SERVER_ERROR]: 'Internal Server Error',
  };
  return phrases[status] ?? (status >= 500 ? 'Server Error' : 'Error');
}

/** Pull the message out of an HttpException's response body (string or object). */
function extractMessage(
  exception: HttpException,
  fallback: string | string[],
): string | string[] {
  const body = exception.getResponse();
  if (typeof body === 'string') return body;
  if (body && typeof body === 'object') {
    const m = (body as { message?: string | string[] }).message;
    if (m !== undefined) return m;
  }
  return fallback;
}
