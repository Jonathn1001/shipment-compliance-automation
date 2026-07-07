import { reconcile } from './reconciler';

describe('reconcile (canonical vs document)', () => {
  it('fills an empty canonical field from the document', () => {
    const result = reconcile({}, { importer: 'Acme Importers Ltd' });

    expect(result.fills).toEqual([
      {
        field: 'importer',
        oldValue: undefined,
        newValue: 'Acme Importers Ltd',
      },
    ]);
    expect(result.conflicts).toEqual([]);
  });

  it('never overwrites a set-and-differing field — surfaces it as a conflict', () => {
    const result = reconcile(
      { importer: 'Acme Importers Ltd' },
      { importer: 'Globex Trading' },
    );

    expect(result.fills).toEqual([]);
    expect(result.conflicts).toEqual([
      {
        field: 'importer',
        canonicalValue: 'Acme Importers Ltd',
        documentValue: 'Globex Trading',
      },
    ]);
  });

  it('treats an equal value as neither a fill nor a conflict', () => {
    const result = reconcile({ currency: 'USD' }, { currency: 'USD' });
    expect(result.fills).toEqual([]);
    expect(result.conflicts).toEqual([]);
  });

  it('handles a mix of fill, conflict and equal in one pass', () => {
    const current = { importer: 'Acme Importers Ltd', currency: 'USD' };
    const incoming = {
      importer: 'Globex Trading', // conflict
      currency: 'USD', // equal
      hsCode: '8471.30', // fill
    };

    const result = reconcile(current, incoming);

    expect(result.fills).toEqual([
      { field: 'hsCode', oldValue: undefined, newValue: '8471.30' },
    ]);
    expect(result.conflicts).toEqual([
      {
        field: 'importer',
        canonicalValue: 'Acme Importers Ltd',
        documentValue: 'Globex Trading',
      },
    ]);
  });

  it('compares numeric values by value, not by type (12 equals "12")', () => {
    const result = reconcile(
      { numberOfPackages: 12 },
      { numberOfPackages: 12 },
    );
    expect(result.fills).toEqual([]);
    expect(result.conflicts).toEqual([]);
  });

  it('treats a decimal that differs only in formatting as neither fill nor conflict', () => {
    // canonical Prisma.Decimal stringifies to "12500.5"; a document may send "12500.50".
    const result = reconcile(
      { invoiceValue: '12500.5' },
      { invoiceValue: '12500.50' },
    );
    expect(result.fills).toEqual([]);
    expect(result.conflicts).toEqual([]);
  });
});
