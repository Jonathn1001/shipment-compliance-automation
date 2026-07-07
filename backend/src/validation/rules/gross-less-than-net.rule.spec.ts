import { Severity } from '../../../generated/prisma/client';
import { makeContext, makeShipment, dec } from '../test-support';
import { GrossLessThanNetRule } from './gross-less-than-net.rule';

describe('GrossLessThanNetRule', () => {
  const rule = new GrossLessThanNetRule();

  it('flags a CRITICAL issue when gross weight is below net weight', () => {
    const ctx = makeContext({
      shipment: makeShipment({
        grossWeightKg: dec('900'),
        netWeightKg: dec('1000'),
      }),
    });

    const issues = rule.evaluate(ctx);

    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      issueType: 'gross-less-than-net',
      severity: Severity.CRITICAL,
      field: 'grossWeightKg',
    });
    expect(issues[0].explanation).toBeTruthy();
    expect(issues[0].suggestedAction).toBeTruthy();
  });

  it('passes when gross weight is greater than or equal to net weight', () => {
    const ctx = makeContext({
      shipment: makeShipment({
        grossWeightKg: dec('1000'),
        netWeightKg: dec('1000'),
      }),
    });
    expect(rule.evaluate(ctx)).toEqual([]);
  });

  it('does not flag when either weight is missing (a different rule owns that)', () => {
    const ctx = makeContext({
      shipment: makeShipment({ grossWeightKg: null, netWeightKg: dec('1000') }),
    });
    expect(rule.evaluate(ctx)).toEqual([]);
  });
});
