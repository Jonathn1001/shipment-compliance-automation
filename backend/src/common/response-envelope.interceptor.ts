import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/** Success envelope: every controller return value is wrapped as `{ data }`. */
export interface SuccessEnvelope<T> {
  data: T;
}

/**
 * Wraps successful responses in a consistent `{ data }` envelope. Paired with
 * {@link AllExceptionsFilter} (which emits `{ error }`) this gives every endpoint
 * a uniform response shape — the NestJS equivalent of a BaseController.
 */
@Injectable()
export class ResponseEnvelopeInterceptor<T> implements NestInterceptor<
  T,
  SuccessEnvelope<T>
> {
  intercept(
    _context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<SuccessEnvelope<T>> {
    return next.handle().pipe(map((data) => ({ data })));
  }
}
