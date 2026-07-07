import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from './env.validation';

/**
 * Typed facade over Nest's ConfigService. Services inject this instead of
 * reading `process.env` directly, so configuration has one typed, testable
 * boundary. Validation thresholds (review window, weight tolerance) are exposed
 * here for the validation rules introduced in later slices.
 */
@Injectable()
export class AppConfigService {
  constructor(
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  get databaseUrl(): string {
    return this.config.get('DATABASE_URL', { infer: true });
  }

  get port(): number {
    return this.config.get('PORT', { infer: true });
  }

  get reviewWindowDays(): number {
    return this.config.get('REVIEW_WINDOW_DAYS', { infer: true });
  }

  get weightTolerancePct(): number {
    return this.config.get('WEIGHT_TOLERANCE_PCT', { infer: true });
  }
}
