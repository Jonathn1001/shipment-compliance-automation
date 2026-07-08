import { Inject, Injectable } from '@nestjs/common';
import {
  AuditAction,
  IssueStatus,
  Severity,
  ShipmentStatus,
} from '../../generated/prisma/client';
import { AppException } from '../common/app.exception';
import { ErrorCode } from '../common/error-code';
import { AuditService } from '../audit/audit.service';
import { AppConfigService } from '../config/app-config.service';
import { DocumentService } from '../document/document.service';
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
  ValidationStep,
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
    private readonly config: AppConfigService,
    private readonly documents: DocumentService,
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
      throw new AppException(ErrorCode.SHIPMENT_NOT_FOUND);
    }

    const sameReference = await this.shipments.findByReference(
      shipment.shipmentReference,
    );
    const documentValues =
      await this.documents.mergedDocumentValues(shipmentId);

    const ctx: ValidationContext = {
      shipment,
      otherShipmentsWithSameReference: sameReference.filter(
        (s) => s.id !== shipment.id,
      ).length,
      documentValues,
      thresholds: {
        reviewWindowDays: this.config.reviewWindowDays,
        weightTolerancePct: this.config.weightTolerancePct,
      },
      now: new Date(),
    };

    const drafts: IssueDraft[] = this.rules.flatMap((rule) =>
      rule.evaluate(ctx),
    );

    return this.prisma.$transaction(async (tx) => {
      const { issues: activeIssues, counts } =
        await this.issues.replaceAndReconcile(shipmentId, drafts, tx);
      // Readiness is driven by OPEN issues only. A WAIVED issue is an accepted
      // risk: it is retained (and returned for display) but must not block the
      // shipment or count toward the report.
      const openIssues = activeIssues.filter(
        (issue) => issue.status === IssueStatus.OPEN,
      );
      const resolved = resolveStatus(openIssues);
      const previousStatus = shipment.currentStatus;
      const nextStatus = resolved.status as ShipmentStatus;

      await this.audit.record(
        AuditAction.VALIDATION_RUN,
        shipmentId,
        actor,
        asJson({
          ruleCount: this.rules.length,
          issueCount: activeIssues.length,
          created: counts.created,
          resolved: counts.resolved,
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
        openIssues,
      );
      const report = await this.reports.create(reportDraft, tx);
      await this.audit.record(
        AuditAction.REPORT_GENERATED,
        shipmentId,
        actor,
        asJson({ reportId: report.id, assessment: report.overallAssessment }),
        tx,
      );

      // A faithful trace of what each phase actually did — the same numbers the
      // engine computed above, surfaced so the UI can replay the run step by step.
      const trace: ValidationStep[] = [
        {
          key: 'context',
          label: 'Load context',
          detail: {
            documentFields: Object.keys(documentValues).length,
            sameReference: ctx.otherShipmentsWithSameReference,
            reviewWindowDays: ctx.thresholds.reviewWindowDays,
            weightTolerancePct: ctx.thresholds.weightTolerancePct,
          },
        },
        {
          key: 'rules',
          label: 'Run rules',
          detail: { rulesRun: this.rules.length, drafts: drafts.length },
        },
        {
          key: 'reconcile',
          label: 'Reconcile issues',
          detail: {
            open: openIssues.length,
            created: counts.created,
            refreshed: counts.refreshed,
            resolved: counts.resolved,
            waivedKept: counts.waivedKept,
          },
        },
        {
          key: 'status',
          label: 'Resolve status',
          detail: {
            from: previousStatus,
            to: nextStatus,
            humanReview: resolved.humanReviewRequired,
          },
        },
        {
          key: 'report',
          label: 'Build report',
          detail: {
            assessment: report.overallAssessment,
            total: report.totalIssues,
            critical: report.criticalCount,
            warnings: report.warningCount,
          },
        },
      ];

      return { status: nextStatus, issues: activeIssues, report, trace };
    });
  }

  listIssues(shipmentId: string, severity?: Severity) {
    return this.issues.findByShipment(shipmentId, severity);
  }

  latestReport(shipmentId: string) {
    return this.reports.findLatest(shipmentId);
  }
}
