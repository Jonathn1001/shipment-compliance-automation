import { ExecutionContext } from '@nestjs/common';
import { AppConfigService } from '../config/app-config.service';
import { ApiAuthGuard } from './api-auth.guard';
import { AppException } from './app.exception';

const contextWith = (authorization?: string): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ headers: authorization ? { authorization } : {} }),
    }),
  }) as unknown as ExecutionContext;

const guardWith = (token?: string): ApiAuthGuard =>
  new ApiAuthGuard({ apiAuthToken: token } as AppConfigService);

describe('ApiAuthGuard', () => {
  it('allows every request when no token is configured (auth disabled)', () => {
    expect(guardWith(undefined).canActivate(contextWith())).toBe(true);
    expect(guardWith(undefined).canActivate(contextWith('Bearer anything'))).toBe(true);
  });

  it('allows a request carrying the correct bearer token', () => {
    expect(guardWith('s3cret').canActivate(contextWith('Bearer s3cret'))).toBe(true);
  });

  it.each([
    ['no header', undefined],
    ['wrong token', 'Bearer nope'],
    ['non-bearer scheme', 'Basic s3cret'],
    ['token of different length', 'Bearer s3cre'],
  ])('rejects when auth is enabled and the request has %s', (_label, header) => {
    expect(() => guardWith('s3cret').canActivate(contextWith(header))).toThrow(
      AppException,
    );
  });
});
