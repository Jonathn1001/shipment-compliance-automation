import { Severity } from '../../../generated/prisma/client';
import { makeContext, makeShipment } from '../test-support';
import { MissingBillOfLadingRule } from './missing-bill-of-lading.rule';

describe('MissingBillOfLadingRule', () => {
  const rule = new MissingBillOfLadingRule();

  it('flags a missing bill of lading number as HIGH', () => {
    const ctx = makeContext({
      shipment: makeShipment({ billOfLadingNumber: null }),
    });
    expect(rule.evaluate(ctx)).toEqual([
      expect.objectContaining({
        issueType: 'missing-bill-of-lading',
        severity: Severity.HIGH,
        field: 'billOfLadingNumber',
      }),
    ]);
  });

  it('passes when a bill of lading number is present', () => {
    const ctx = makeContext({
      shipment: makeShipment({ billOfLadingNumber: 'BL-88231' }),
    });
    expect(rule.evaluate(ctx)).toEqual([]);
  });
});
