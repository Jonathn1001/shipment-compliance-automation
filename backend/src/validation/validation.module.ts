import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { ShipmentModule } from '../shipment/shipment.module';
import { ReadinessReportRepository } from './readiness-report.repository';
import { GrossLessThanNetRule } from './rules/gross-less-than-net.rule';
import { ValidationController } from './validation.controller';
import { ValidationIssueRepository } from './validation-issue.repository';
import { ValidationService } from './validation.service';
import { VALIDATION_RULES } from './validation.types';

/**
 * Validation module. Rules are registered via the `VALIDATION_RULES` multi-
 * provider token; the engine iterates them, so later slices add a rule by adding
 * a class here — no engine change (open/closed). Issue 03 ships one rule.
 */
@Module({
  imports: [ShipmentModule, AuditModule],
  controllers: [ValidationController],
  providers: [
    ValidationService,
    ValidationIssueRepository,
    ReadinessReportRepository,
    GrossLessThanNetRule,
    {
      provide: VALIDATION_RULES,
      useFactory: (grossLessThanNet: GrossLessThanNetRule) => [
        grossLessThanNet,
      ],
      inject: [GrossLessThanNetRule],
    },
  ],
  exports: [ValidationService],
})
export class ValidationModule {}
