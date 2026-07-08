import { countryCode, countryName, isKnownCountry } from './iso3166.util';

describe('ISO 3166-1 country utilities', () => {
  describe('isKnownCountry', () => {
    it.each(['CN', 'de', ' JP ', 'China'])(
      'accepts a known code or name %s (case/space tolerant)',
      (value) => {
        expect(isKnownCountry(value)).toBe(true);
      },
    );

    it.each(['XX', 'ZZ', 'Atlantis', ''])(
      'rejects an unknown value %s',
      (value) => {
        expect(isKnownCountry(value)).toBe(false);
      },
    );
  });

  describe('countryCode', () => {
    it('normalizes a code to uppercase alpha-2', () => {
      expect(countryCode(' cn ')).toBe('CN');
    });

    it('resolves an English name to its code', () => {
      expect(countryCode('Germany')).toBe('DE');
    });

    it('returns undefined for an unknown value', () => {
      expect(countryCode('XX')).toBeUndefined();
    });
  });

  describe('countryName', () => {
    it('returns the English name for a known code', () => {
      expect(countryName('JP')).toBe('Japan');
    });

    it('returns undefined for an unknown code', () => {
      expect(countryName('ZZ')).toBeUndefined();
    });
  });
});
