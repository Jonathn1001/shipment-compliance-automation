import {
  hsChapterTitle,
  isKnownHsChapter,
  isValidHsFormat,
} from './hs-code.util';

describe('HS code utilities', () => {
  describe('isValidHsFormat', () => {
    it.each(['8471.30', '847130', '8471.30.00', '8471300000'])(
      'accepts a well-formed HS code %s (dots/spaces ignored, 6-10 digits)',
      (code) => {
        expect(isValidHsFormat(code)).toBe(true);
      },
    );

    it.each(['847', '84A130', '', '84713000000'])(
      'rejects a malformed HS code %s',
      (code) => {
        expect(isValidHsFormat(code)).toBe(false);
      },
    );
  });

  describe('isKnownHsChapter', () => {
    it('accepts a code whose first two digits are a known WCO chapter', () => {
      expect(isKnownHsChapter('8471.30')).toBe(true); // chapter 84
    });

    it('rejects a code in a reserved/absent chapter (77)', () => {
      expect(isKnownHsChapter('7715.00')).toBe(false);
    });

    it('rejects a malformed code', () => {
      expect(isKnownHsChapter('8A')).toBe(false);
    });
  });

  describe('hsChapterTitle', () => {
    it('returns the chapter title for a known code', () => {
      expect(hsChapterTitle('8471.30')).toContain('machinery');
    });

    it('returns undefined for an unknown chapter', () => {
      expect(hsChapterTitle('7715.00')).toBeUndefined();
    });
  });
});
