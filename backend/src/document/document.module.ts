import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { ShipmentModule } from '../shipment/shipment.module';
import { DocumentController } from './document.controller';
import { DocumentRepository } from './document.repository';
import { DocumentService } from './document.service';

/**
 * Document ingestion module. Depends on ShipmentModule (canonical record +
 * repository) and AuditModule (ingestion / field-update trail).
 */
@Module({
  imports: [ShipmentModule, AuditModule],
  controllers: [DocumentController],
  providers: [DocumentService, DocumentRepository],
  exports: [DocumentService],
})
export class DocumentModule {}
