import { HttpException } from '@nestjs/common';
import { ERROR_META, ErrorCode } from './error-code';

/**
 * Domain exception carrying a stable {@link ErrorCode}. The HTTP status and a
 * client-safe default message come from the code's catalog entry; either can be
 * overridden. `details` carries structured extras (e.g. per-field validation
 * errors) surfaced under `error.details`.
 *
 * Throw this instead of raw NestJS HttpExceptions so every deliberate failure
 * resolves to a catalogued code the client can branch on.
 */
export class AppException extends HttpException {
  readonly code: ErrorCode;
  readonly details?: unknown;

  constructor(
    code: ErrorCode,
    options?: { message?: string; status?: number; details?: unknown },
  ) {
    const meta = ERROR_META[code];
    super(options?.message ?? meta.message, options?.status ?? meta.status);
    this.code = code;
    this.details = options?.details;
  }
}
