import {
  ReadinessAssessment,
  Severity,
  ShipmentStatus,
} from '../../generated/prisma/client';
import { ResolvedStatus } from './status-resolver';

/** The report builder needs each issue's severity and its suggested action. */
export interface ReportableIssue {
  severity: Severity;
  suggestedAction: string;
}

/** The computed, not-yet-persisted readiness report (append-only history row). */
export interface ReadinessReportDraft {
  shipmentId: string;
  statusSnapshot: ShipmentStatus;
  overallAssessment: ReadinessAssessment;
  humanReviewRequired: boolean;
  totalIssues: number;
  criticalCount: number;
  warningCount: number;
  nextActions: string[];
}

const ASSESSMENT_BY_STATUS: Record<
  ResolvedStatus['status'],
  ReadinessAssessment
> = {
  READY: ReadinessAssessment.READY_TO_PROCEED,
  NEEDS_REVIEW: ReadinessAssessment.NEEDS_HUMAN_REVIEW,
  BLOCKED: ReadinessAssessment.BLOCKED,
};

/**
 * Pure readiness report builder. Summarizes the shipment's issues into a single
 * decision-ready artifact: counts (total, critical, warnings = HIGH+MEDIUM), the
 * snapshotted status and overall assessment, whether human review is required,
 * and a de-duplicated list of suggested next actions (in first-seen order).
 */
export function buildReadinessReport(
  shipmentId: string,
  resolved: ResolvedStatus,
  issues: ReportableIssue[],
): ReadinessReportDraft {
  const criticalCount = issues.filter(
    (i) => i.severity === Severity.CRITICAL,
  ).length;
  const warningCount = issues.filter(
    (i) => i.severity === Severity.HIGH || i.severity === Severity.MEDIUM,
  ).length;

  const nextActions = dedupe(
    issues.map((i) => i.suggestedAction).filter((a) => a.trim() !== ''),
  );

  return {
    shipmentId,
    statusSnapshot: resolved.status,
    overallAssessment: ASSESSMENT_BY_STATUS[resolved.status],
    humanReviewRequired: resolved.humanReviewRequired,
    totalIssues: issues.length,
    criticalCount,
    warningCount,
    nextActions,
  };
}

function dedupe(values: string[]): string[] {
  return [...new Set(values)];
}
