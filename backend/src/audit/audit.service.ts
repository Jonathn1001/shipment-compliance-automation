import { Injectable } from '@nestjs/common';
import { AuditAction, Prisma } from '../../generated/prisma/client';
import { AuditDbClient, AuditLogRepository } from './audit-log.repository';

/** Actor defaults to the system when a human actor is not supplied. */
export const SYSTEM_ACTOR = 'system';

/**
 * Append-only audit recording, injected into every state-changing service. The
 * optional `client` lets callers record inside an existing `$transaction`.
 */
@Injectable()
export class AuditService {
  constructor(private readonly repository: AuditLogRepository) {}

  async record(
    action: AuditAction,
    shipmentId: string,
    actor: string = SYSTEM_ACTOR,
    details?: Prisma.InputJsonValue,
    client?: AuditDbClient,
  ): Promise<void> {
    await this.repository.append(
      { shipmentId, action, actor, details },
      client,
    );
  }

  listForShipment(shipmentId: string) {
    return this.repository.findByShipment(shipmentId);
  }
}
