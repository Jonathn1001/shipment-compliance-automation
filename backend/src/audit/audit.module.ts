import { Module } from '@nestjs/common';
import { AuditLogRepository } from './audit-log.repository';
import { AuditService } from './audit.service';

/**
 * Audit module. Exports AuditService for injection into state-changing feature
 * services (shipment creation, ingestion, validation, approval).
 */
@Module({
  providers: [AuditService, AuditLogRepository],
  exports: [AuditService],
})
export class AuditModule {}
