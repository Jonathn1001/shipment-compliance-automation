import { Severity } from '../../../generated/prisma/client';
import { makeContext, makeShipment } from '../test-support';
import { WoodPackagingIspm15Rule } from './wood-packaging-ispm15.rule';

describe('WoodPackagingIspm15Rule', () => {
  const rule = new WoodPackagingIspm15Rule();

  it('flags wood packaging without ISPM15 certification as CRITICAL', () => {
    const ctx = makeContext({
      shipment: makeShipment({
        packagingType: 'Wooden crate',
        ispm15Certified: false,
      }),
    });
    expect(rule.evaluate(ctx)).toEqual([
      expect.objectContaining({
        issueType: 'wood-packaging-ispm15',
        severity: Severity.CRITICAL,
        field: 'ispm15Certified',
      }),
    ]);
  });

  it('also flags when certification is unknown (null) for wood packaging', () => {
    const ctx = makeContext({
      shipment: makeShipment({
        packagingType: 'wood pallet',
        ispm15Certified: null,
      }),
    });
    expect(rule.evaluate(ctx)).toHaveLength(1);
  });

  it('passes when wood packaging is ISPM15 certified', () => {
    const ctx = makeContext({
      shipment: makeShipment({
        packagingType: 'Wooden crate',
        ispm15Certified: true,
      }),
    });
    expect(rule.evaluate(ctx)).toEqual([]);
  });

  it('passes for non-wood packaging regardless of certification', () => {
    const ctx = makeContext({
      shipment: makeShipment({
        packagingType: 'Plastic',
        ispm15Certified: null,
      }),
    });
    expect(rule.evaluate(ctx)).toEqual([]);
  });
});
