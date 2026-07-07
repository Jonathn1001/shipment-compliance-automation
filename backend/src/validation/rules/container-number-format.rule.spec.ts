import { Severity } from '../../../generated/prisma/client';
import { makeContext, makeShipment } from '../test-support';
import { ContainerNumberFormatRule } from './container-number-format.rule';

describe('ContainerNumberFormatRule', () => {
  const rule = new ContainerNumberFormatRule();

  it('flags an invalid ISO-6346 container number as MEDIUM', () => {
    const ctx = makeContext({
      shipment: makeShipment({ containerNumber: 'CSQU3054384' }),
    });
    expect(rule.evaluate(ctx)).toEqual([
      expect.objectContaining({
        issueType: 'container-number-format',
        severity: Severity.MEDIUM,
        field: 'containerNumber',
      }),
    ]);
  });

  it('passes for a valid container number', () => {
    const ctx = makeContext({
      shipment: makeShipment({ containerNumber: 'CSQU3054383' }),
    });
    expect(rule.evaluate(ctx)).toEqual([]);
  });

  it('does not flag when container number is absent (may be non-containerized freight)', () => {
    const ctx = makeContext({
      shipment: makeShipment({ containerNumber: null }),
    });
    expect(rule.evaluate(ctx)).toEqual([]);
  });
});
