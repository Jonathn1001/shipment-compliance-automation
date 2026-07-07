import { Severity } from '../../../generated/prisma/client';
import { makeContext } from '../test-support';
import { DuplicateShipmentReferenceRule } from './duplicate-shipment-reference.rule';

describe('DuplicateShipmentReferenceRule', () => {
  const rule = new DuplicateShipmentReferenceRule();

  it('flags a duplicated shipment reference as CRITICAL', () => {
    const ctx = makeContext({ otherShipmentsWithSameReference: 1 });
    expect(rule.evaluate(ctx)).toEqual([
      expect.objectContaining({
        issueType: 'duplicate-shipment-reference',
        severity: Severity.CRITICAL,
        field: 'shipmentReference',
      }),
    ]);
  });

  it('passes when the reference is unique', () => {
    const ctx = makeContext({ otherShipmentsWithSameReference: 0 });
    expect(rule.evaluate(ctx)).toEqual([]);
  });
});
