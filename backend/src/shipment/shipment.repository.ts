import { Injectable } from '@nestjs/common';
import { Prisma, Severity, ShipmentStatus } from '../../generated/prisma/client';
import { keysetArgs, PageOpts } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaTx } from '../prisma/prisma-tx';

/**
 * Intent-based data access for shipments. Controllers and services never touch
 * Prisma directly — they go through these methods, keeping the service layer
 * ORM-agnostic and unit-testable. Write methods accept an optional transaction
 * client so they compose inside a `$transaction`.
 */
@Injectable()
export class ShipmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.ShipmentCreateInput, client: PrismaTx = this.prisma) {
    return client.shipment.create({ data });
  }

  update(
    id: string,
    data: Prisma.ShipmentUpdateInput,
    client: PrismaTx = this.prisma,
  ) {
    return client.shipment.update({ where: { id }, data });
  }

  findById(id: string) {
    return this.prisma.shipment.findUnique({ where: { id } });
  }

  /**
   * A page of shipments for the triage list, newest first, each with a count of
   * its OPEN validation issues (the list screen's "issue count" column). Uses a
   * filtered relation `_count` so counting happens in one query, not N+1. Bounded
   * by `opts.take`; `id` is the keyset tiebreaker so `updatedAt` ties page cleanly.
   */
  async list(opts: PageOpts) {
    const rows = await this.prisma.shipment.findMany({
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      include: {
        _count: { select: { issues: { where: { status: 'OPEN' } } } },
      },
      ...keysetArgs(opts),
    });
    return rows.map(({ _count, ...shipment }) => ({
      ...shipment,
      openIssueCount: _count.issues,
    }));
  }

  /**
   * All shipments sharing a reference. Reference is intentionally not unique, so
   * this can return several rows — used by the duplicate-reference rule later.
   */
  findByReference(shipmentReference: string) {
    return this.prisma.shipment.findMany({ where: { shipmentReference } });
  }

  // --- Dashboard aggregates (GET /shipments/stats) ---

  /** Count of shipments grouped by their current lifecycle status. */
  async countByStatus(): Promise<Map<ShipmentStatus, number>> {
    const rows = await this.prisma.shipment.groupBy({
      by: ['currentStatus'],
      _count: true,
    });
    return new Map(rows.map((r) => [r.currentStatus, r._count]));
  }

  /** Count of OPEN validation issues grouped by severity. */
  async countOpenIssuesBySeverity(): Promise<Map<Severity, number>> {
    const rows = await this.prisma.validationIssue.groupBy({
      by: ['severity'],
      where: { status: 'OPEN' },
      _count: true,
    });
    return new Map(rows.map((r) => [r.severity, r._count]));
  }

  /** Creation timestamps of shipments created on/after `since` (for the trend). */
  async createdAtsSince(since: Date): Promise<Date[]> {
    const rows = await this.prisma.shipment.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true },
    });
    return rows.map((r) => r.createdAt);
  }
}
