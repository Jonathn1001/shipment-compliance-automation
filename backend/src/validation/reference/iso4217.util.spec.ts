import { currencyName, isKnownCurrency } from './iso4217.util';

describe('ISO 4217 currency utilities', () => {
  describe('isKnownCurrency', () => {
    it.each(['USD', 'eur', ' JPY '])(
      'accepts a known code %s (case/space tolerant)',
      (code) => {
        expect(isKnownCurrency(code)).toBe(true);
      },
    );

    it.each(['ZZZ', 'US', 'DOLLAR', ''])(
      'rejects an unknown code %s',
      (code) => {
        expect(isKnownCurrency(code)).toBe(false);
      },
    );
  });

  describe('currencyName', () => {
    it('returns a name for a known code', () => {
      expect(currencyName('USD')).toMatch(/dollar/i);
    });

    it('returns undefined for an unknown code', () => {
      expect(currencyName('ZZZ')).toBeUndefined();
    });
  });
});
