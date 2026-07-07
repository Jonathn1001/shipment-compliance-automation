import { ValidationError } from '@nestjs/common';
import { AppException } from './app.exception';
import { ErrorCode } from './error-code';

/** One offending field and the human messages for the rules it broke. */
interface FieldError {
  field: string;
  messages: string[];
}

/**
 * Flatten class-validator errors (including nested children) into `FieldError`s.
 * Nested paths are dotted, e.g. `payload.currency`.
 */
function toFieldErrors(errors: ValidationError[], parent = ''): FieldError[] {
  const out: FieldError[] = [];
  for (const err of errors) {
    const field = parent ? `${parent}.${err.property}` : err.property;
    if (err.constraints) {
      out.push({ field, messages: Object.values(err.constraints) });
    }
    if (err.children && err.children.length > 0) {
      out.push(...toFieldErrors(err.children, field));
    }
  }
  return out;
}

/**
 * ValidationPipe `exceptionFactory`: turn input-validation failures into a
 * single {@link AppException}(VALIDATION_ERROR) — HTTP 422 with the offending
 * fields under `error.details`, so the client branches on the code and reads
 * structured per-field errors rather than parsing free-form text.
 */
export function validationExceptionFactory(
  errors: ValidationError[],
): AppException {
  return new AppException(ErrorCode.VALIDATION_ERROR, {
    details: toFieldErrors(errors),
  });
}
