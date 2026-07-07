import hsData from './wco-hs-chapters.json';

/**
 * HS (Harmonized System) code helpers backed by a committed WCO chapter snapshot
 * (mocked, not a live lookup). A code is well-formed if, after removing dots and
 * spaces, it is 6-10 digits (HS6 plus optional national extension). Its chapter
 * is the first two digits; `isKnownHsChapter` checks that chapter exists in the
 * nomenclature (reserved chapters 77/98/99 are absent).
 */

const CHAPTERS = hsData.chapters as Record<string, string>;

const digitsOnly = (code: string): string => code.replace(/[.\s]/g, '');

export function isValidHsFormat(code: string): boolean {
  const digits = digitsOnly(code);
  return /^[0-9]{6,10}$/.test(digits);
}

export function isKnownHsChapter(code: string): boolean {
  return hsChapterTitle(code) !== undefined;
}

export function hsChapterTitle(code: string): string | undefined {
  const digits = digitsOnly(code);
  if (digits.length < 2) return undefined;
  return CHAPTERS[digits.slice(0, 2)];
}
