/**
 * The canonical projection of a document — the subset of shipment fields a
 * document can supply. Intentionally DB-agnostic plain data so the field mapper
 * and reconciler stay pure and unit-testable in isolation: money and weights are
 * carried as strings (not `Decimal`) to preserve precision without coupling to
 * Prisma, and dates as ISO strings.
 */
export interface CanonicalFields {
  exporter?: string;
  importer?: string;
  importerId?: string;
  invoiceNumber?: string;
  invoiceValue?: string;
  currency?: string;
  goodsDescription?: string;
  hsCode?: string;
  countryOfOrigin?: string;
  grossWeightKg?: string;
  netWeightKg?: string;
  numberOfPackages?: number;
  containerNumber?: string;
  billOfLadingNumber?: string;
  packagingType?: string;
  ispm15Certified?: boolean;
  eformCertificate?: string;
  freightMode?: string;
  arrivalDate?: string;
}

/** The canonical field keys, in a stable order. */
export type CanonicalKey = keyof CanonicalFields;
