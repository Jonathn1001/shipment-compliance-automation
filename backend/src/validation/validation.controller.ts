import { Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { ValidationService } from './validation.service';

/**
 * Validation + read surface for a shipment. `x-actor` records the human actor in
 * the audit trail (defaults to "system").
 */
@Controller('shipments/:id')
export class ValidationController {
  constructor(
    private readonly validation: ValidationService,
    private readonly audit: AuditService,
  ) {}

  @Post('validate')
  validate(@Param('id') id: string, @Headers('x-actor') actor?: string) {
    return this.validation.run(id, actor);
  }

  @Get('issues')
  issues(@Param('id') id: string) {
    return this.validation.listIssues(id);
  }

  @Get('readiness-report')
  readinessReport(@Param('id') id: string) {
    return this.validation.latestReport(id);
  }

  @Get('audit-log')
  auditLog(@Param('id') id: string) {
    return this.audit.listForShipment(id);
  }
}
