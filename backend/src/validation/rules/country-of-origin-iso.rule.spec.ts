import { Severity } from '../../../generated/prisma/client';
import { makeContext, makeShipment } from '../test-support';
import { CountryOfOriginIsoRule } from './country-of-origin-iso.rule';

describe('CountryOfOriginIsoRule', () => {
  const rule = new CountryOfOriginIsoRule();

  it('flags a present-but-unknown country as HIGH', () => {
    const ctx = makeContext({
      shipment: makeShipment({ countryOfOrigin: 'XX' }),
    });
    expect(rule.evaluate(ctx)).toEqual([
      expect.objectContaining({
        issueType: 'country-of-origin-iso',
        severity: Severity.HIGH,
        field: 'countryOfOrigin',
      }),
    ]);
  });

  it('passes for a valid ISO alpha-2 code', () => {
    const ctx = makeContext({
      shipment: makeShipment({ countryOfOrigin: 'CN' }),
    });
    expect(rule.evaluate(ctx)).toEqual([]);
  });

  it('does not fire on a missing country (that is another rule’s concern)', () => {
    const ctx = makeContext({
      shipment: makeShipment({ countryOfOrigin: null }),
    });
    expect(rule.evaluate(ctx)).toEqual([]);
  });
});
