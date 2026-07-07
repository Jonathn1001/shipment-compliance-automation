import { Prisma } from '../../generated/prisma/client';
import { CanonicalKey } from './canonical';

/** Canonical fields carried as decimals (compared numerically, not textually). */
const DECIMAL_FIELDS = new Set<CanonicalKey>([
  'invoiceValue',
  'grossWeightKg',
  'netWeightKg',
]);

/** Canonical fields carried as dates (compared by instant, not textually). */
const DATE_FIELDS = new Set<CanonicalKey>(['arrivalDate']);

/**
 * Compare two canonical field values for equality, tolerant of representation.
 * Decimal fields are compared numerically ("12500.50" equals "12500.5"), date
 * fields by parsed instant ("2026-07-01" equals its ISO datetime), everything
 * else as trimmed strings. Used by the reconciler (fill vs conflict) and the
 * document-vs-shipment mismatch rule so equal-but-differently-formatted values
 * are not treated as disagreements.
 */
export function valuesEqual(
  field: CanonicalKey,
  a: unknown,
  b: unknown,
): boolean {
  if (DECIMAL_FIELDS.has(field)) return decimalEqual(a, b);
  if (DATE_FIELDS.has(field)) return dateEqual(a, b);
  return String(a).trim() === String(b).trim();
}

function decimalEqual(a: unknown, b: unknown): boolean {
  try {
    return new Prisma.Decimal(a as Prisma.Decimal.Value).equals(
      new Prisma.Decimal(b as Prisma.Decimal.Value),
    );
  } catch {
    // A non-numeric value can never equal a numeric canonical value.
    return false;
  }
}

function dateEqual(a: unknown, b: unknown): boolean {
  const ta = new Date(a as string).getTime();
  const tb = new Date(b as string).getTime();
  if (Number.isNaN(ta) || Number.isNaN(tb))
    return String(a).trim() === String(b).trim();
  return ta === tb;
}
