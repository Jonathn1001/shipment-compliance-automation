import { Injectable } from '@nestjs/common';
import { AuditAction, Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/** A Prisma client capable of the audit writes — the root client or a `$transaction` client. */
export type AuditDbClient = PrismaService | Prisma.TransactionClient;

export interface AuditEntry {
  shipmentId: string;
  action: AuditAction;
  actor: string;
  details?: Prisma.InputJsonValue;
}

/**
 * Append-only access to the audit trail. `append` optionally accepts a
 * transaction client so the validation engine (later slice) can record audit
 * rows inside the same `$transaction` as the state change they describe.
 */
@Injectable()
export class AuditLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async append(
    entry: AuditEntry,
    client: AuditDbClient = this.prisma,
  ): Promise<void> {
    await client.auditLog.create({
      data: {
        shipmentId: entry.shipmentId,
        action: entry.action,
        actor: entry.actor,
        details: entry.details,
      },
    });
  }

  findByShipment(shipmentId: string) {
    return this.prisma.auditLog.findMany({
      where: { shipmentId },
      orderBy: { timestamp: 'desc' },
    });
  }
}
