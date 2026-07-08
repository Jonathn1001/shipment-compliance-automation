import iso4217 from './iso-4217.json';

/**
 * ISO 4217 currency helpers backed by a committed snapshot (mocked, not a live
 * lookup). A currency is known if its uppercased alpha-3 code exists in the
 * snapshot. Absence of a currency is not this helper's concern.
 */

const CURRENCIES = iso4217.currencies as Record<string, string>;

export function isKnownCurrency(code: string): boolean {
  return CURRENCIES[code.trim().toUpperCase()] !== undefined;
}

export function currencyName(code: string): string | undefined {
  return CURRENCIES[code.trim().toUpperCase()];
}
