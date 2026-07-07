import { DocumentType } from '../../generated/prisma/client';
import { CanonicalFields, CanonicalKey } from './canonical';

/**
 * Field mapper — pure normalization of a heterogeneous document payload into the
 * canonical field shape. `map(rawInput, documentType) -> mappedFields`.
 *
 * Each canonical field lists the raw key aliases it accepts (alias order = match
 * priority). Raw keys are matched loosely: comparison ignores case and any
 * non-alphanumeric characters, so `invoice_value`, `invoiceValue` and
 * `Invoice Value` all resolve to the same field. The document type resolves a
 * few otherwise-ambiguous bare keys (e.g. `number`).
 */

/** Base aliases per canonical field. The canonical camelCase name is included. */
const BASE_ALIASES: Record<CanonicalKey, string[]> = {
  exporter: ['exporter', 'seller', 'shipper', 'consignor'],
  importer: ['importer', 'buyer', 'consignee'],
  importerId: ['importerId', 'importer_id', 'buyer_id', 'consignee_id'],
  invoiceNumber: ['invoiceNumber', 'invoice_number', 'invoice_no'],
  invoiceValue: [
    'invoiceValue',
    'invoice_value',
    'total_value',
    'value',
    'amount',
  ],
  currency: ['currency', 'ccy'],
  goodsDescription: [
    'goodsDescription',
    'goods_description',
    'description',
    'goods',
  ],
  hsCode: ['hsCode', 'hs_code', 'tariff_code', 'commodity_code'],
  countryOfOrigin: [
    'countryOfOrigin',
    'country_of_origin',
    'origin',
    'origin_country',
  ],
  grossWeightKg: ['grossWeightKg', 'gross_weight_kg', 'gross_weight'],
  netWeightKg: ['netWeightKg', 'net_weight_kg', 'net_weight'],
  numberOfPackages: [
    'numberOfPackages',
    'number_of_packages',
    'packages',
    'package_count',
    'no_of_packages',
  ],
  containerNumber: ['containerNumber', 'container_number', 'container'],
  billOfLadingNumber: [
    'billOfLadingNumber',
    'bill_of_lading_number',
    'bl_number',
    'bol_number',
  ],
  packagingType: [
    'packagingType',
    'packaging_type',
    'packaging',
    'package_type',
  ],
  ispm15Certified: ['ispm15Certified', 'ispm15_certified', 'ispm15', 'ispm_15'],
  eformCertificate: [
    'eformCertificate',
    'eform_certificate',
    'form_e_number',
    'certificate_number',
    'coo_number',
  ],
  freightMode: [
    'freightMode',
    'freight_mode',
    'mode',
    'transport_mode',
    'mode_of_transport',
  ],
  arrivalDate: ['arrivalDate', 'arrival_date', 'eta', 'arrival'],
};

/** Type-scoped aliases: a bare key that only makes sense for a given document. */
const TYPE_SCOPED_ALIASES: Partial<
  Record<DocumentType, Partial<Record<CanonicalKey, string[]>>>
> = {
  [DocumentType.COMMERCIAL_INVOICE]: { invoiceNumber: ['number'] },
  [DocumentType.BILL_OF_LADING]: { billOfLadingNumber: ['number'] },
  [DocumentType.CERTIFICATE_FORM_E]: { eformCertificate: ['number'] },
};

const DECIMAL_FIELDS = new Set<CanonicalKey>([
  'invoiceValue',
  'grossWeightKg',
  'netWeightKg',
]);
const INT_FIELDS = new Set<CanonicalKey>(['numberOfPackages']);
const BOOL_FIELDS = new Set<CanonicalKey>(['ispm15Certified']);

const normalizeKey = (key: string): string =>
  key.toLowerCase().replace(/[^a-z0-9]/g, '');

const CANONICAL_KEYS = Object.keys(BASE_ALIASES) as CanonicalKey[];

export function mapDocument(
  rawInput: Record<string, unknown>,
  documentType: DocumentType,
): CanonicalFields {
  // Index raw keys by their normalized form (first occurrence wins).
  const rawByNormalized = new Map<string, unknown>();
  for (const [key, value] of Object.entries(rawInput)) {
    const norm = normalizeKey(key);
    if (!rawByNormalized.has(norm)) {
      rawByNormalized.set(norm, value);
    }
  }

  const scoped = TYPE_SCOPED_ALIASES[documentType] ?? {};
  const result: CanonicalFields = {};

  for (const field of CANONICAL_KEYS) {
    const aliases = [...BASE_ALIASES[field], ...(scoped[field] ?? [])];
    for (const alias of aliases) {
      if (!rawByNormalized.has(normalizeKey(alias))) continue;
      const coerced = coerce(field, rawByNormalized.get(normalizeKey(alias)));
      if (coerced !== undefined) {
        (result[field] as unknown) = coerced;
        break;
      }
    }
  }

  return result;
}

function coerce(
  field: CanonicalKey,
  value: unknown,
): string | number | boolean | undefined {
  if (value === null || value === undefined) return undefined;
  if (DECIMAL_FIELDS.has(field)) return toDecimalString(value);
  if (INT_FIELDS.has(field)) return toInt(value);
  if (BOOL_FIELDS.has(field)) return toBool(value);
  return toTrimmedString(value);
}

function toTrimmedString(value: unknown): string | undefined {
  const str = String(value).trim();
  return str === '' ? undefined : str;
}

function toDecimalString(value: unknown): string | undefined {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value.toString() : undefined;
  }
  const str = String(value).trim();
  return str === '' ? undefined : str;
}

function toInt(value: unknown): number | undefined {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? Math.trunc(value) : undefined;
  }
  const parsed = Number.parseInt(String(value).trim(), 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function toBool(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  const str = String(value).trim().toLowerCase();
  if (['true', 'yes', 'y', '1'].includes(str)) return true;
  if (['false', 'no', 'n', '0'].includes(str)) return false;
  return undefined;
}
