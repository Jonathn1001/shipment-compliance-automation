import { IsEnum, IsOptional } from 'class-validator';
import { Severity } from '../../../generated/prisma/client';
import { PaginationQueryDto } from '../../common/pagination';

/**
 * Query params for `GET /shipments/:id/issues`: optional `severity` filter plus
 * inherited `limit`/`cursor` pagination. When present, `severity` must be a known
 * {@link Severity} — the global ValidationPipe (whitelist + forbidNonWhitelisted)
 * rejects an unknown value rather than silently returning the unfiltered set.
 */
export class ListIssuesQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(Severity)
  severity?: Severity;
}
