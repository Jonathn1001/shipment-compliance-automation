import { plainToInstance } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  Min,
  validateSync,
} from 'class-validator';

/**
 * The full set of environment variables the application depends on. This is the
 * single place (with {@link validate}) that reads raw env; every service reads
 * configuration through the typed AppConfigService instead of `process.env`.
 */
export class EnvironmentVariables {
  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number = 3000;

  @IsInt()
  @Min(0)
  REVIEW_WINDOW_DAYS: number = 30;

  @IsInt()
  @Min(0)
  @Max(100)
  WEIGHT_TOLERANCE_PCT: number = 5;
}

/**
 * ConfigModule `validate` hook: fail fast at bootstrap on missing/invalid env.
 * `enableImplicitConversion` coerces the string env values to the typed shape
 * (e.g. PORT "3000" -> 3000) so downstream reads are already typed.
 */
export function validate(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validated, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    // Constraint messages only (property names + rules) — never the values,
    // so a bad DATABASE_URL is not echoed into logs.
    const summary = errors
      .map((e) => Object.values(e.constraints ?? {}).join(', '))
      .join('; ');
    throw new Error(`Invalid environment configuration: ${summary}`);
  }

  return validated;
}
