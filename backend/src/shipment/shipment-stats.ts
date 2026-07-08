import { Severity, ShipmentStatus } from '../../generated/prisma/client';

/** One month bucket of the shipments-over-time series. */
export interface MonthlyPoint {
  /** Sortable `YYYY-MM` key. */
  month: string;
  /** Short month label for the chart axis, e.g. `Feb`. */
  label: string;
  count: number;
}

/** Dashboard aggregate returned by `GET /shipments/stats`. */
export interface ShipmentStats {
  total: number;
  byStatus: Record<ShipmentStatus, number>;
  openIssuesBySeverity: Record<Severity, number>;
  shipmentsOverTime: MonthlyPoint[];
}

const ym = (d: Date): string =>
  `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;

/** First instant of the earliest month in a `months`-wide window ending at `now`. */
export function windowStart(now: Date, months: number): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1));
}

/**
 * Bucket shipment creation timestamps into the last `months` calendar months
 * (UTC), oldest first, filling empty months with zero — pure so the axis is
 * deterministic and unit-testable independent of the DB.
 */
export function buildMonthlySeries(
  createdAts: Date[],
  now: Date,
  months = 6,
): MonthlyPoint[] {
  const counts = new Map<string, number>();
  for (const d of createdAts) {
    const key = ym(d);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const points: MonthlyPoint[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const key = ym(d);
    points.push({
      month: key,
      label: d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }),
      count: counts.get(key) ?? 0,
    });
  }
  return points;
}

/** Fill every enum key with a zero default, then overlay the observed counts. */
export function tally<K extends string>(
  keys: readonly K[],
  observed: Map<K, number>,
): Record<K, number> {
  const out = {} as Record<K, number>;
  for (const k of keys) out[k] = observed.get(k) ?? 0;
  return out;
}
