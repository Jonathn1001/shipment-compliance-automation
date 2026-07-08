import { Severity } from '../../../generated/prisma/client';
import { makeContext, makeShipment } from '../test-support';
import { CurrencyIsoRule } from './currency-iso.rule';

describe('CurrencyIsoRule', () => {
  const rule = new CurrencyIsoRule();

  it('flags a present-but-unknown currency as MEDIUM', () => {
    const ctx = makeContext({ shipment: makeShipment({ currency: 'ZZZ' }) });
    expect(rule.evaluate(ctx)).toEqual([
      expect.objectContaining({
        issueType: 'currency-iso',
        severity: Severity.MEDIUM,
        field: 'currency',
      }),
    ]);
  });

  it('passes for a valid ISO 4217 code', () => {
    const ctx = makeContext({ shipment: makeShipment({ currency: 'USD' }) });
    expect(rule.evaluate(ctx)).toEqual([]);
  });

  it('does not fire on a missing currency', () => {
    const ctx = makeContext({ shipment: makeShipment({ currency: null }) });
    expect(rule.evaluate(ctx)).toEqual([]);
  });
});
