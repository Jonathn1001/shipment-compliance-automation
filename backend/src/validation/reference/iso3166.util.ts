import iso3166 from './iso-3166.json';

/**
 * ISO 3166-1 country helpers backed by a committed alpha-2 snapshot (mocked, not
 * a live lookup). Canonical shipment data carries the alpha-2 code (e.g. `CN`);
 * we accept that case-insensitively and, for tolerance, an exact English country
 * name (e.g. `China`). Absence is not this helper's concern — the
 * missing-country-of-origin rule handles that.
 */

const COUNTRIES = iso3166.countries as Record<string, string>;

const NAME_TO_CODE: Record<string, string> = Object.fromEntries(
  Object.entries(COUNTRIES).map(([code, name]) => [name.toLowerCase(), code]),
);

const normalize = (value: string): string => value.trim();

export function isKnownCountry(value: string): boolean {
  return countryCode(value) !== undefined;
}

/** Resolve an input (alpha-2 code or English name) to its alpha-2 code. */
export function countryCode(value: string): string | undefined {
  const input = normalize(value);
  const upper = input.toUpperCase();
  if (COUNTRIES[upper] !== undefined) return upper;
  return NAME_TO_CODE[input.toLowerCase()];
}

export function countryName(value: string): string | undefined {
  const code = countryCode(value);
  return code ? COUNTRIES[code] : undefined;
}
