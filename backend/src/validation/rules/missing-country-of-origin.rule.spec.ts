import { Severity } from '../../../generated/prisma/client';
import { makeContext, makeShipment } from '../test-support';
import { MissingCountryOfOriginRule } from './missing-country-of-origin.rule';

describe('MissingCountryOfOriginRule', () => {
  const rule = new MissingCountryOfOriginRule();

  it('flags a missing country of origin as MEDIUM', () => {
    const ctx = makeContext({
      shipment: makeShipment({ countryOfOrigin: null }),
    });
    expect(rule.evaluate(ctx)).toEqual([
      expect.objectContaining({
        issueType: 'missing-country-of-origin',
        severity: Severity.MEDIUM,
        field: 'countryOfOrigin',
      }),
    ]);
  });

  it('passes when country of origin is present', () => {
    const ctx = makeContext({
      shipment: makeShipment({ countryOfOrigin: 'CN' }),
    });
    expect(rule.evaluate(ctx)).toEqual([]);
  });
});
