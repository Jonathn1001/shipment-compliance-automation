import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { ShipmentController } from './shipment.controller';
import { ShipmentRepository } from './shipment.repository';
import { ShipmentService } from './shipment.service';

/**
 * Shipment feature module: controller + service + repository. Pulls in
 * AuditModule so creation (and later state changes) are recorded.
 */
@Module({
  imports: [AuditModule],
  controllers: [ShipmentController],
  providers: [ShipmentService, ShipmentRepository],
  exports: [ShipmentService, ShipmentRepository],
})
export class ShipmentModule {}
