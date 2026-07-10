import { CanonicalKey } from './canonical';

/**
 * Runtime kind of a canonical field. Drives the three places a field's type
 * matters: how the field mapper coerces a raw document value, how a persisted
 * Shipment is projected back into the plain canonical shape, and how a fill is
 * turned into a Prisma update. `date` is carried as an ISO string in the
 * canonical shape (mapped like a string) but is a `DateTime` column.
 */
export type FieldKind = 'string' | 'decimal' | 'int' | 'bool' | 'date';

/**
 * The single source of truth for each canonical field's kind. Typed as a total
 * `Record<CanonicalKey, …>` so adding a `CanonicalKey` without a kind (or a kind
 * for a non-field) is a compile error. Adding a canonical field is now: a Prisma
 * column, a `CanonicalFields` entry, and one line here — the mapper coercion, the
 * shipment→canonical projection and the fill→update conversion all derive from it.
 */
export const FIELD_KIND: Record<CanonicalKey, FieldKind> = {
  exporter: 'string',
  importer: 'string',
  importerId: 'string',
  invoiceNumber: 'string',
  invoiceValue: 'decimal',
  currency: 'string',
  goodsDescription: 'string',
  hsCode: 'string',
  countryOfOrigin: 'string',
  grossWeightKg: 'decimal',
  netWeightKg: 'decimal',
  numberOfPackages: 'int',
  containerNumber: 'string',
  billOfLadingNumber: 'string',
  packagingType: 'string',
  ispm15Certified: 'bool',
  eformCertificate: 'string',
  freightMode: 'string',
  arrivalDate: 'date',
};

/** The canonical field keys, in the descriptor's declared order. */
export const CANONICAL_KEYS = Object.keys(FIELD_KIND) as CanonicalKey[];
