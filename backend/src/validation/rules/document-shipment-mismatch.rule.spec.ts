import { Severity } from '../../../generated/prisma/client';
import { dec, makeContext, makeShipment } from '../test-support';
import { DocumentShipmentMismatchRule } from './document-shipment-mismatch.rule';

describe('DocumentShipmentMismatchRule', () => {
  const rule = new DocumentShipmentMismatchRule();

  it('flags a document value that disagrees with a set canonical value as HIGH', () => {
    const ctx = makeContext({
      shipment: makeShipment({ importer: 'Acme Importers Ltd' }),
      documentValues: { importer: 'Globex Trading' },
    });
    const issues = rule.evaluate(ctx);
    expect(issues).toEqual([
      expect.objectContaining({
        issueType: 'document-shipment-mismatch',
        severity: Severity.HIGH,
        field: 'importer',
      }),
    ]);
  });

  it('does not flag when the document agrees with the canonical value', () => {
    const ctx = makeContext({
      shipment: makeShipment({ importer: 'Acme Importers Ltd' }),
      documentValues: { importer: 'Acme Importers Ltd' },
    });
    expect(rule.evaluate(ctx)).toEqual([]);
  });

  it('does not flag when the canonical value is empty (that is a fill, not a mismatch)', () => {
    const ctx = makeContext({
      shipment: makeShipment({ importer: null }),
      documentValues: { importer: 'Globex Trading' },
    });
    expect(rule.evaluate(ctx)).toEqual([]);
  });

  it('does not flag a decimal that is numerically equal but formatted differently', () => {
    const ctx = makeContext({
      shipment: makeShipment({ invoiceValue: dec('12500.50') }),
      documentValues: { invoiceValue: '12500.5' },
    });
    expect(rule.evaluate(ctx)).toEqual([]);
  });
});
