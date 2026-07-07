import { Severity } from '../../../generated/prisma/client';
import { dec, makeContext, makeShipment } from '../test-support';
import { WeightDiscrepancyRule } from './weight-discrepancy.rule';

describe('WeightDiscrepancyRule', () => {
  const rule = new WeightDiscrepancyRule();

  it('flags a gross/net gap beyond the tolerance as MEDIUM', () => {
    // net 1000, gross 1200 -> 20% > 5% tolerance.
    const ctx = makeContext({
      shipment: makeShipment({
        grossWeightKg: dec('1200'),
        netWeightKg: dec('1000'),
      }),
      thresholds: { reviewWindowDays: 30, weightTolerancePct: 5 },
    });
    const issues = rule.evaluate(ctx);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      issueType: 'weight-discrepancy',
      severity: Severity.MEDIUM,
      field: 'grossWeightKg',
    });
  });

  it('passes when the gap is within tolerance', () => {
    const ctx = makeContext({
      shipment: makeShipment({
        grossWeightKg: dec('1030'),
        netWeightKg: dec('1000'),
      }),
    });
    expect(rule.evaluate(ctx)).toEqual([]);
  });

  it('does not fire when gross < net (a CRITICAL rule owns that) or weights are missing', () => {
    const below = makeContext({
      shipment: makeShipment({
        grossWeightKg: dec('900'),
        netWeightKg: dec('1000'),
      }),
    });
    const missing = makeContext({
      shipment: makeShipment({ grossWeightKg: null, netWeightKg: dec('1000') }),
    });
    expect(rule.evaluate(below)).toEqual([]);
    expect(rule.evaluate(missing)).toEqual([]);
  });
});
