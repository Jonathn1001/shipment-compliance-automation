import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

/** Hard upper bound on any list page — caps the memory/latency of a single read. */
export const MAX_PAGE_SIZE = 200;
/** Default page size for the global shipments queue (paged via "load more"). */
export const DEFAULT_PAGE_SIZE = 50;

/**
 * Optional keyset ("seek") pagination query: `?limit=&cursor=<lastRowId>`. The
 * client supplies the id of the last row it already holds as the cursor, so no
 * next-cursor needs to travel in the body — every list stays a plain array.
 */
export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  limit?: number;

  @IsOptional()
  @IsString()
  cursor?: string;
}

export interface PageOpts {
  take: number;
  cursor?: string;
}

/** Clamp a requested limit into `[1, MAX_PAGE_SIZE]`, falling back when unset. */
export function pageOpts(
  query: PaginationQueryDto,
  fallback: number = DEFAULT_PAGE_SIZE,
): PageOpts {
  const take = Math.min(Math.max(query.limit ?? fallback, 1), MAX_PAGE_SIZE);
  return { take, cursor: query.cursor };
}

/**
 * Prisma keyset arguments for a `findMany`: take the page size, and when a cursor
 * is given, seek past that row (`skip: 1`). Ordering is the caller's concern; the
 * cursor id must be a stable tiebreaker in that ordering.
 */
export function keysetArgs(opts: PageOpts): {
  take: number;
  skip?: number;
  cursor?: { id: string };
} {
  return {
    take: opts.take,
    ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
  };
}
