import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaTx } from '../prisma/prisma-tx';
import { ReadinessReportDraft } from './report-builder';

@Injectable()
export class ReadinessReportRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Append one readiness report row (history is retained, never overwritten). */
  create(draft: ReadinessReportDraft, client: PrismaTx = this.prisma) {
    return client.readinessReport.create({ data: draft });
  }

  /** Latest report for a shipment, or null if none has been generated yet. */
  findLatest(shipmentId: string) {
    return this.prisma.readinessReport.findFirst({
      where: { shipmentId },
      orderBy: { generatedAt: 'desc' },
    });
  }
}
