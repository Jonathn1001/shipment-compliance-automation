import { isChapterCovered, isPlausibleOrigin } from './commodity-country.util';

describe('commodity↔country plausibility utilities', () => {
  describe('isChapterCovered', () => {
    it('is true for a covered chapter (84 machinery)', () => {
      expect(isChapterCovered('8471.30')).toBe(true);
    });

    it('is false for an uncovered chapter (01 live animals)', () => {
      expect(isChapterCovered('0101.10')).toBe(false);
    });
  });

  describe('isPlausibleOrigin', () => {
    it('accepts a well-known exporter for the chapter (CN, chapter 84)', () => {
      expect(isPlausibleOrigin('8471.30', 'CN')).toBe(true);
    });

    it('accepts an origin given by name', () => {
      expect(isPlausibleOrigin('8471.30', 'China')).toBe(true);
    });

    it('rejects an unusual exporter for a covered chapter', () => {
      expect(isPlausibleOrigin('8471.30', 'FJ')).toBe(false); // Fiji, machinery
    });

    it('accepts anything for an uncovered chapter (no signal)', () => {
      expect(isPlausibleOrigin('0101.10', 'FJ')).toBe(true);
    });

    it('accepts an unknown country (that is the ISO rule’s concern)', () => {
      expect(isPlausibleOrigin('8471.30', 'XX')).toBe(true);
    });
  });
});
