import { Prisma } from '../../generated/prisma/client';

/**
 * Narrow an already-safe value to Prisma's JSON input type at a persistence
 * boundary. Domain payloads (audit details, mapped document fields) are plain
 * JSON-serializable objects, but their static types are broader than
 * `InputJsonValue`; this documents the single spot where that cast is intended
 * instead of scattering an ad-hoc `as` at each call site.
 */
export const toJsonInput = (value: unknown): Prisma.InputJsonValue =>
  value as Prisma.InputJsonValue;
