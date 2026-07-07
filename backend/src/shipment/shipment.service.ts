import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditAction,
  Prisma,
  ShipmentStatus,
} from '../../generated/prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { ShipmentRepository } from './shipment.repository';

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
      throw new NotFoundException(`Shipment ${id} not found`);
    }
    return shipment;
  }

  findAll() {
    return this.repository.list();
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
      throw new NotFoundException(`Shipment ${id} not found`);
    }
    if (shipment.currentStatus === ShipmentStatus.BLOCKED) {
      throw new ConflictException(
        'A BLOCKED shipment cannot be approved; resolve blocking issues first.',
      );
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
