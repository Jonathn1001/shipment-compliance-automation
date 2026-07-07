/**
 * ISO-6346 container number validation. Format: 4 letters (3-letter owner code +
 * equipment category U/J/Z) + 6-digit serial + 1 check digit, e.g. CSQU3054383.
 *
 * Check digit: each of the first 10 characters gets a value (letters map to
 * 10..38 skipping multiples of 11; digits are themselves), weighted by 2^position,
 * summed, mod 11; a remainder of 10 means a check digit of 0.
 */

const LETTER_VALUES: Record<string, number> = {
  A: 10,
  B: 12,
  C: 13,
  D: 14,
  E: 15,
  F: 16,
  G: 17,
  H: 18,
  I: 19,
  J: 20,
  K: 21,
  L: 23,
  M: 24,
  N: 25,
  O: 26,
  P: 27,
  Q: 28,
  R: 29,
  S: 30,
  T: 31,
  U: 32,
  V: 34,
  W: 35,
  X: 36,
  Y: 37,
  Z: 38,
};

const FORMAT = /^[A-Z]{3}[UJZ][0-9]{6}[0-9]$/;

export function isValidContainerNumber(input: string): boolean {
  const value = input.trim().toUpperCase();
  if (!FORMAT.test(value)) return false;

  let sum = 0;
  for (let i = 0; i < 10; i++) {
    const char = value[i];
    const charValue = /[0-9]/.test(char) ? Number(char) : LETTER_VALUES[char];
    sum += charValue * 2 ** i;
  }

  const checkDigit = sum % 11 === 10 ? 0 : sum % 11;
  return checkDigit === Number(value[10]);
}
