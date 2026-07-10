import { describe, expect, it } from 'vitest';
import { guessDocType } from './guessDocType';

describe('guessDocType', () => {
  it('recognizes each document family from the file name', () => {
    expect(guessDocType('Commercial-Invoice-2026.json')).toBe('COMMERCIAL_INVOICE');
    expect(guessDocType('packing_list.csv')).toBe('PACKING_LIST');
    expect(guessDocType('house-bill-of-lading.txt')).toBe('BILL_OF_LADING');
    expect(guessDocType('form-e-cert.json')).toBe('CERTIFICATE_FORM_E');
  });

  it('matches "bl" only as a whole word, not inside another word', () => {
    expect(guessDocType('BL-2201.json')).toBe('BILL_OF_LADING');
    expect(guessDocType('table.json')).toBeNull();
  });

  it('is case-insensitive', () => {
    expect(guessDocType('INVOICE.JSON')).toBe('COMMERCIAL_INVOICE');
  });

  it('returns null when nothing matches', () => {
    expect(guessDocType('random.json')).toBeNull();
  });
});
