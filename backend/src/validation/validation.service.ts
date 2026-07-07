import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, ShipmentStatus } from '../../generated/prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { ShipmentRepository } from '../shipment/shipment.repository';
import { ReadinessReportRepository } from './readiness-report.repository';
import { buildReadinessReport } from './report-builder';
import { resolveStatus } from './status-resolver';
import { ValidationIssueRepository } from './validation-issue.repository';
import {
  IssueDraft,
  ValidationContext,
  ValidationRule,
  VALIDATION_RULES,
} from './validation.types';

const asJson = (v: unknown) => v as Parameters<AuditService['record']>[3];

@Injectable()
export class ValidationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly shipments: ShipmentRepository,
    private readonly issues: ValidationIssueRepository,
    private readonly reports: ReadinessReportRepository,
    private readonly audit: AuditService,
    @Inject(VALIDATION_RULES) private readonly rules: ValidationRule[],
  ) {}

  /**
   * Run validation for a shipment, atomically. Loads context, runs every
   * registered rule, reconciles the resulting drafts with prior issues (WAIVED
   * preserved, absent-since-last-run resolved), resolves the readiness status,
   * updates the shipment, appends a readiness report, and writes the audit trail
   * (VALIDATION_RUN, STATUS_CHANGED, REPORT_GENERATED) — all in one transaction.
   */
  async run(shipmentId: string, actor?: string) {
    const shipment = await this.shipments.findById(shipmentId);
    if (!shipment) {
      throw new NotFoundException(`Shipment ${shipmentId} not found`);
    }

    const ctx: ValidationContext = {
      shipment,
      otherShipmentsWithSameReference: 0,
      thresholds: { reviewWindowDays: 30, weightTolerancePct: 5 },
      now: new Date(),
    };

    const drafts: IssueDraft[] = this.rules.flatMap((rule) =>
      rule.evaluate(ctx),
    );

    return this.prisma.$transaction(async (tx) => {
      const activeIssues = await this.issues.replaceAndReconcile(
        shipmentId,
        drafts,
        tx,
      );
      const resolved = resolveStatus(activeIssues);
      const previousStatus = shipment.currentStatus;
      const nextStatus = resolved.status as ShipmentStatus;

      await this.audit.record(
        AuditAction.VALIDATION_RUN,
        shipmentId,
        actor,
        asJson({
          ruleCount: this.rules.length,
          issueCount: activeIssues.length,
        }),
        tx,
      );

      if (nextStatus !== previousStatus) {
        await this.shipments.update(
          shipmentId,
          { currentStatus: nextStatus },
          tx,
        );
        await this.audit.record(
          AuditAction.STATUS_CHANGED,
          shipmentId,
          actor,
          asJson({ oldValue: previousStatus, newValue: nextStatus }),
          tx,
        );
      }

      const reportDraft = buildReadinessReport(
        shipmentId,
        resolved,
        activeIssues,
      );
      const report = await this.reports.create(reportDraft, tx);
      await this.audit.record(
        AuditAction.REPORT_GENERATED,
        shipmentId,
        actor,
        asJson({ reportId: report.id, assessment: report.overallAssessment }),
        tx,
      );

      return { status: nextStatus, issues: activeIssues, report };
    });
  }

  listIssues(shipmentId: string) {
    return this.issues.findByShipment(shipmentId);
  }

  latestReport(shipmentId: string) {
    return this.reports.findLatest(shipmentId);
  }
}
