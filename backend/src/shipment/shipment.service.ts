import { Injectable } from '@nestjs/common';
import {
  AuditAction,
  Prisma,
  Severity,
  ShipmentStatus,
} from '../../generated/prisma/client';
import { AppException } from '../common/app.exception';
import { ErrorCode } from '../common/error-code';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { ShipmentRepository } from './shipment.repository';
import {
  buildMonthlySeries,
  ShipmentStats,
  tally,
  windowStart,
} from './shipment-stats';

/** How many trailing months the dashboard trend covers. */
const TREND_MONTHS = 6;

@Injectable()
export class ShipmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: ShipmentRepository,
    private readonly audit: AuditService,
  ) {}

  /**
   * Create a shipment and record its creation in the audit trail atomically:
   * the shipment row and its SHIPMENT_CREATED audit entry are written in one
   * `$transaction`, so a shipment never exists without its audit record.
   */
  async create(dto: CreateShipmentDto, actor?: string) {
    const data = this.toCreateInput(dto);

    return this.prisma.$transaction(async (tx) => {
      const shipment = await this.repository.create(data, tx);
      await this.audit.record(
        AuditAction.SHIPMENT_CREATED,
        shipment.id,
        actor,
        { shipmentReference: shipment.shipmentReference },
        tx,
      );
      return shipment;
    });
  }

  async findOne(id: string) {
    const shipment = await this.repository.findById(id);
    if (!shipment) {
      throw new AppException(ErrorCode.SHIPMENT_NOT_FOUND);
    }
    return shipment;
  }

  findAll() {
    return this.repository.list();
  }

  /**
   * Aggregate counts for the dashboard: shipments by status, OPEN issues by
   * severity, and a zero-filled shipments-over-time trend. Every enum key is
   * present (0 when unseen) so the client never has to special-case gaps.
   */
  async stats(now: Date = new Date()): Promise<ShipmentStats> {
    const [byStatusRaw, bySeverityRaw, createdAts] = await Promise.all([
      this.repository.countByStatus(),
      this.repository.countOpenIssuesBySeverity(),
      this.repository.createdAtsSince(windowStart(now, TREND_MONTHS)),
    ]);

    const byStatus = tally(
      Object.values(ShipmentStatus) as ShipmentStatus[],
      byStatusRaw,
    );
    return {
      total: Object.values(byStatus).reduce((a, b) => a + b, 0),
      byStatus,
      openIssuesBySeverity: tally(
        Object.values(Severity) as Severity[],
        bySeverityRaw,
      ),
      shipmentsOverTime: buildMonthlySeries(createdAts, now, TREND_MONTHS),
    };
  }

  /**
   * Approve a shipment to advance it to the next operational stage. Guarded: a
   * BLOCKED shipment cannot be approved (409) — no status change, no audit entry
   * — so a non-compliant shipment can never be moved forward by accident. On
   * success the shipment becomes APPROVED and SHIPMENT_APPROVED + STATUS_CHANGED
   * are recorded atomically.
   */
  async approve(id: string, actor?: string) {
    const shipment = await this.repository.findById(id);
    if (!shipment) {
      throw new AppException(ErrorCode.SHIPMENT_NOT_FOUND);
    }
    if (shipment.currentStatus === ShipmentStatus.BLOCKED) {
      throw new AppException(ErrorCode.SHIPMENT_BLOCKED);
    }

    return this.prisma.$transaction(async (tx) => {
      const previousStatus = shipment.currentStatus;
      const updated = await this.repository.update(
        id,
        { currentStatus: ShipmentStatus.APPROVED },
        tx,
      );
      await this.audit.record(AuditAction.SHIPMENT_APPROVED, id, actor, {}, tx);
      if (previousStatus !== ShipmentStatus.APPROVED) {
        await this.audit.record(
          AuditAction.STATUS_CHANGED,
          id,
          actor,
          { oldValue: previousStatus, newValue: ShipmentStatus.APPROVED },
          tx,
        );
      }
      return updated;
    });
  }

  /** Map the validated DTO onto the Prisma create input (dates coerced). */
  private toCreateInput(dto: CreateShipmentDto): Prisma.ShipmentCreateInput {
    const { arrivalDate, ...rest } = dto;
    return {
      ...rest,
      arrivalDate: arrivalDate ? new Date(arrivalDate) : undefined,
    };
  }
}
