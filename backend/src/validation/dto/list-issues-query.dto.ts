import { IsEnum, IsOptional } from 'class-validator';
import { Severity } from '../../../generated/prisma/client';

/**
 * Query params for `GET /shipments/:id/issues`. `severity` is optional; when
 * present it must be a known {@link Severity} — the global ValidationPipe
 * (whitelist + forbidNonWhitelisted) rejects an unknown value with 400 rather
 * than silently returning the unfiltered set.
 */
export class ListIssuesQueryDto {
  @IsOptional()
  @IsEnum(Severity)
  severity?: Severity;
}
