import { Severity } from '../../../generated/prisma/client';
import { makeContext, makeShipment } from '../test-support';
import { CommodityCountryPlausibilityRule } from './commodity-country-plausibility.rule';

describe('CommodityCountryPlausibilityRule', () => {
  const rule = new CommodityCountryPlausibilityRule();

  it('flags an unusual origin for a covered chapter as LOW advisory', () => {
    const ctx = makeContext({
      shipment: makeShipment({ hsCode: '8471.30', countryOfOrigin: 'FJ' }),
    });
    expect(rule.evaluate(ctx)).toEqual([
      expect.objectContaining({
        issueType: 'commodity-country-plausibility',
        severity: Severity.LOW,
        field: 'countryOfOrigin',
      }),
    ]);
  });

  it('passes for a plausible origin (CN, machinery)', () => {
    const ctx = makeContext({
      shipment: makeShipment({ hsCode: '8471.30', countryOfOrigin: 'CN' }),
    });
    expect(rule.evaluate(ctx)).toEqual([]);
  });

  it('does not fire for an uncovered chapter', () => {
    const ctx = makeContext({
      shipment: makeShipment({ hsCode: '0101.10', countryOfOrigin: 'FJ' }),
    });
    expect(rule.evaluate(ctx)).toEqual([]);
  });

  it('does not fire when HS code or country is missing', () => {
    expect(
      rule.evaluate(
        makeContext({ shipment: makeShipment({ hsCode: null, countryOfOrigin: 'FJ' }) }),
      ),
    ).toEqual([]);
    expect(
      rule.evaluate(
        makeContext({ shipment: makeShipment({ hsCode: '8471.30', countryOfOrigin: null }) }),
      ),
    ).toEqual([]);
  });

  it('does not fire for an unknown country (deferred to the ISO rule)', () => {
    const ctx = makeContext({
      shipment: makeShipment({ hsCode: '8471.30', countryOfOrigin: 'XX' }),
    });
    expect(rule.evaluate(ctx)).toEqual([]);
  });
});
