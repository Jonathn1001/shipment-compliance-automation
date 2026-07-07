import { Severity } from '../../../generated/prisma/client';
import { dec, makeContext, makeShipment } from '../test-support';
import { InvoiceValueRule } from './invoice-value.rule';

describe('InvoiceValueRule', () => {
  const rule = new InvoiceValueRule();

  it('flags a missing invoice value as HIGH', () => {
    const ctx = makeContext({ shipment: makeShipment({ invoiceValue: null }) });
    expect(rule.evaluate(ctx)).toEqual([
      expect.objectContaining({
        issueType: 'invoice-value',
        severity: Severity.HIGH,
        field: 'invoiceValue',
      }),
    ]);
  });

  it('flags a non-positive (suspicious) invoice value', () => {
    const ctx = makeContext({
      shipment: makeShipment({ invoiceValue: dec('0') }),
    });
    expect(rule.evaluate(ctx)).toHaveLength(1);
  });

  it('passes for a positive invoice value', () => {
    const ctx = makeContext({
      shipment: makeShipment({ invoiceValue: dec('12500.50') }),
    });
    expect(rule.evaluate(ctx)).toEqual([]);
  });
});
