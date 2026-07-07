import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
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

  list() {
    return this.prisma.shipment.findMany({ orderBy: { updatedAt: 'desc' } });
  }

  /**
   * All shipments sharing a reference. Reference is intentionally not unique, so
   * this can return several rows — used by the duplicate-reference rule later.
   */
  findByReference(shipmentReference: string) {
    return this.prisma.shipment.findMany({ where: { shipmentReference } });
  }
}
