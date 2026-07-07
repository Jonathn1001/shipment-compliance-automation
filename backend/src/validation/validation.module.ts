import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { DocumentModule } from '../document/document.module';
import { ShipmentModule } from '../shipment/shipment.module';
import { ReadinessReportRepository } from './readiness-report.repository';
import { ArrivalDateWindowRule } from './rules/arrival-date-window.rule';
import { CertificateFormERule } from './rules/certificate-form-e.rule';
import { ContainerNumberFormatRule } from './rules/container-number-format.rule';
import { DocumentShipmentMismatchRule } from './rules/document-shipment-mismatch.rule';
import { DuplicateShipmentReferenceRule } from './rules/duplicate-shipment-reference.rule';
import { GrossLessThanNetRule } from './rules/gross-less-than-net.rule';
import { HsCodeFormatRule } from './rules/hs-code-format.rule';
import { InvoiceValueRule } from './rules/invoice-value.rule';
import { MissingBillOfLadingRule } from './rules/missing-bill-of-lading.rule';
import { MissingCountryOfOriginRule } from './rules/missing-country-of-origin.rule';
import { MissingRequiredFieldRule } from './rules/missing-required-field.rule';
import { WeightDiscrepancyRule } from './rules/weight-discrepancy.rule';
import { WoodPackagingIspm15Rule } from './rules/wood-packaging-ispm15.rule';
import { ValidationController } from './validation.controller';
import { ValidationIssueRepository } from './validation-issue.repository';
import { ValidationService } from './validation.service';
import { ValidationRule, VALIDATION_RULES } from './validation.types';

/** Every rule class, registered as a provider and composed into VALIDATION_RULES. */
const RULES = [
  GrossLessThanNetRule,
  MissingRequiredFieldRule,
  HsCodeFormatRule,
  MissingCountryOfOriginRule,
  WeightDiscrepancyRule,
  MissingBillOfLadingRule,
  ContainerNumberFormatRule,
  InvoiceValueRule,
  WoodPackagingIspm15Rule,
  ArrivalDateWindowRule,
  DuplicateShipmentReferenceRule,
  DocumentShipmentMismatchRule,
  CertificateFormERule,
];

/**
 * Validation module. Rules are registered via the `VALIDATION_RULES` multi-
 * provider token; the engine iterates them, so adding a rule is adding a class to
 * `RULES` — no engine change (open/closed). Depends on DocumentModule so the
 * engine can load ingested document values for the mismatch rule.
 */
@Module({
  imports: [ShipmentModule, AuditModule, DocumentModule],
  controllers: [ValidationController],
  providers: [
    ValidationService,
    ValidationIssueRepository,
    ReadinessReportRepository,
    ...RULES,
    {
      provide: VALIDATION_RULES,
      useFactory: (...rules: ValidationRule[]) => rules,
      inject: RULES,
    },
  ],
  exports: [ValidationService],
})
export class ValidationModule {}
