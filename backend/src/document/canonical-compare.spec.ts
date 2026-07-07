import { valuesEqual } from './canonical-compare';

describe('valuesEqual (canonical field comparison)', () => {
  it('treats numerically-equal decimals with different formatting as equal', () => {
    // A document may supply a decimal as a formatted string; the canonical value
    // is a Prisma.Decimal stringified to "12500.5".
    expect(valuesEqual('invoiceValue', '12500.5', '12500.50')).toBe(true);
    expect(valuesEqual('grossWeightKg', '520', '520.000')).toBe(true);
  });

  it('flags genuinely different decimals as not equal', () => {
    expect(valuesEqual('invoiceValue', '12500.5', '12600.00')).toBe(false);
  });

  it('treats a date and its ISO datetime as equal', () => {
    expect(
      valuesEqual('arrivalDate', '2026-07-01T00:00:00.000Z', '2026-07-01'),
    ).toBe(true);
  });

  it('flags different dates as not equal', () => {
    expect(
      valuesEqual('arrivalDate', '2026-07-01T00:00:00.000Z', '2026-07-02'),
    ).toBe(false);
  });

  it('compares non-numeric, non-date fields as trimmed strings', () => {
    expect(
      valuesEqual('importer', 'Acme Importers Ltd', 'Acme Importers Ltd'),
    ).toBe(true);
    expect(
      valuesEqual('importer', 'Acme Importers Ltd', 'Globex Trading'),
    ).toBe(false);
  });

  it('returns false when one side is a non-numeric string for a decimal field', () => {
    expect(valuesEqual('invoiceValue', '12500.5', 'not-a-number')).toBe(false);
  });
});
