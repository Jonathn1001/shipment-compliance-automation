import type { ShipmentStatus } from '../api/types';

const LABELS: Record<ShipmentStatus, string> = {
  CREATED: 'Created',
  READY: 'Ready',
  NEEDS_REVIEW: 'Needs review',
  BLOCKED: 'Blocked',
  APPROVED: 'Approved',
};

/** Status "lamp" badge — the color encodes readiness severity across the app. */
export function StatusBadge({ status }: { status: ShipmentStatus }) {
  return (
    <span className={`badge status-${status}`}>
      <span className="lamp" aria-hidden="true" />
      {LABELS[status]}
    </span>
  );
}
