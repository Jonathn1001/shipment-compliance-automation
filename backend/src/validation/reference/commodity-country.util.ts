import data from './comtrade-plausibility.json';
import { countryCode } from './iso3166.util';

/**
 * Commodity↔country plausibility helpers backed by a committed UN Comtrade
 * export-flow snapshot (mocked, not a live lookup). For a bounded set of HS
 * chapters we know the well-known major exporting origins; an origin outside that
 * set is *unusual*, not invalid — hence advisory. A chapter absent from the
 * snapshot is not covered and never flagged.
 */

const BY_CHAPTER = data.chaptersByExporters as Record<string, string[]>;

const chapterOf = (hsCode: string): string | undefined => {
  const digits = hsCode.replace(/[.\s]/g, '');
  return digits.length >= 2 ? digits.slice(0, 2) : undefined;
};

/** True when we hold a plausibility list for this HS code's chapter. */
export function isChapterCovered(hsCode: string): boolean {
  const chapter = chapterOf(hsCode);
  return chapter !== undefined && BY_CHAPTER[chapter] !== undefined;
}

/**
 * True when `country` (alpha-2 code or English name) is a well-known exporter for
 * the HS code's chapter. Returns `true` for chapters we do not cover (no signal =
 * no objection), so callers should gate on `isChapterCovered` first.
 */
export function isPlausibleOrigin(hsCode: string, country: string): boolean {
  const chapter = chapterOf(hsCode);
  if (chapter === undefined) return true;
  const exporters = BY_CHAPTER[chapter];
  if (exporters === undefined) return true;
  const code = countryCode(country);
  if (code === undefined) return true; // unknown country is the ISO rule's concern
  return exporters.includes(code);
}
