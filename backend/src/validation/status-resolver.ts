import { Severity, ShipmentStatus } from '../../generated/prisma/client';

/** The status resolver only needs each issue's severity. */
export interface HasSeverity {
  severity: Severity;
}

export interface ResolvedStatus {
  status: Extract<ShipmentStatus, 'READY' | 'NEEDS_REVIEW' | 'BLOCKED'>;
  humanReviewRequired: boolean;
}

/**
 * Pure severity → readiness status mapping:
 *   any CRITICAL            → BLOCKED
 *   else any HIGH or MEDIUM → NEEDS_REVIEW
 *   else (LOW or none)      → READY
 * `humanReviewRequired` is true whenever the shipment is not READY.
 */
export function resolveStatus(issues: HasSeverity[]): ResolvedStatus {
  const hasCritical = issues.some((i) => i.severity === Severity.CRITICAL);
  if (hasCritical) {
    return { status: 'BLOCKED', humanReviewRequired: true };
  }

  const hasReviewable = issues.some(
    (i) => i.severity === Severity.HIGH || i.severity === Severity.MEDIUM,
  );
  if (hasReviewable) {
    return { status: 'NEEDS_REVIEW', humanReviewRequired: true };
  }

  return { status: 'READY', humanReviewRequired: false };
}
