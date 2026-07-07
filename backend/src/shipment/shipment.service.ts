import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, Prisma } from '../../generated/prisma/client';
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

  /** Map the validated DTO onto the Prisma create input (dates coerced). */
  private toCreateInput(dto: CreateShipmentDto): Prisma.ShipmentCreateInput {
    const { arrivalDate, ...rest } = dto;
    return {
      ...rest,
      arrivalDate: arrivalDate ? new Date(arrivalDate) : undefined,
    };
  }
}
