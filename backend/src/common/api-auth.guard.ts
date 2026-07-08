import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';
import { AppConfigService } from '../config/app-config.service';
import { AppException } from './app.exception';
import { ErrorCode } from './error-code';

/**
 * Optional bearer-token gate over every route. When `API_AUTH_TOKEN` is not
 * configured the guard is a no-op (the take-home runs open by default); when it
 * is set, each request must carry `Authorization: Bearer <token>`. This closes
 * the "every endpoint is world-callable" gap without inventing a user/tenant
 * model — per-owner authorization (IDOR) still requires that model and is
 * intentionally out of scope.
 */
@Injectable()
export class ApiAuthGuard implements CanActivate {
  constructor(private readonly config: AppConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.config.apiAuthToken;
    if (!expected) return true; // auth disabled

    const request = context.switchToHttp().getRequest<Request>();
    const header = request.headers.authorization;
    const provided =
      typeof header === 'string' && header.startsWith('Bearer ')
        ? header.slice('Bearer '.length)
        : '';

    if (!provided || !safeEqual(provided, expected)) {
      throw new AppException(ErrorCode.UNAUTHORIZED);
    }
    return true;
  }
}

/** Length-safe, constant-time string comparison (avoids timing side-channels). */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}
