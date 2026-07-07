import { Severity } from '../../../generated/prisma/client';
import { makeContext, makeShipment } from '../test-support';
import { ArrivalDateWindowRule } from './arrival-date-window.rule';

describe('ArrivalDateWindowRule', () => {
  const rule = new ArrivalDateWindowRule();
  const now = new Date('2026-07-07T00:00:00.000Z');

  it('flags an arrival date older than the review window as MEDIUM', () => {
    const ctx = makeContext({
      now,
      shipment: makeShipment({
        arrivalDate: new Date('2026-05-01T00:00:00.000Z'),
      }), // > 30 days
      thresholds: { reviewWindowDays: 30, weightTolerancePct: 5 },
    });
    expect(rule.evaluate(ctx)).toEqual([
      expect.objectContaining({
        issueType: 'arrival-date-window',
        severity: Severity.MEDIUM,
        field: 'arrivalDate',
      }),
    ]);
  });

  it('passes for a recent arrival date within the window', () => {
    const ctx = makeContext({
      now,
      shipment: makeShipment({
        arrivalDate: new Date('2026-07-01T00:00:00.000Z'),
      }),
    });
    expect(rule.evaluate(ctx)).toEqual([]);
  });

  it('does not flag when arrival date is absent', () => {
    const ctx = makeContext({
      now,
      shipment: makeShipment({ arrivalDate: null }),
    });
    expect(rule.evaluate(ctx)).toEqual([]);
  });
});
