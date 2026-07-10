import { Controller, Get, Headers, Param, Post, Query } from '@nestjs/common';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { Severity } from '../../generated/prisma/client';
import { AuditService } from '../audit/audit.service';
import { MAX_PAGE_SIZE, pageOpts, PaginationQueryDto } from '../common/pagination';
import { ListIssuesQueryDto } from './dto/list-issues-query.dto';
import { ValidationService } from './validation.service';

/**
 * Validation + read surface for a shipment. `x-actor` records the human actor in
 * the audit trail (defaults to "system").
 */
@ApiTags('Validation')
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
  @ApiQuery({
    name: 'severity',
    enum: Severity,
    required: false,
    description: 'Return only issues of this severity.',
  })
  issues(@Param('id') id: string, @Query() query: ListIssuesQueryDto) {
    return this.validation.listIssues(
      id,
      query.severity,
      pageOpts(query, MAX_PAGE_SIZE),
    );
  }

  @Get('readiness-report')
  readinessReport(@Param('id') id: string) {
    return this.validation.latestReport(id);
  }

  @Get('audit-log')
  auditLog(@Param('id') id: string, @Query() query: PaginationQueryDto) {
    return this.audit.listForShipment(id, pageOpts(query, MAX_PAGE_SIZE));
  }
}
