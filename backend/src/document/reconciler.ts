import { CanonicalFields, CanonicalKey } from './canonical';
import { valuesEqual } from './canonical-compare';

/** A canonical field that was empty and is being filled from a document. */
export interface FieldFill {
  field: CanonicalKey;
  oldValue: undefined;
  newValue: unknown;
}

/** A document value that disagrees with an already-set canonical value. */
export interface FieldConflict {
  field: CanonicalKey;
  canonicalValue: unknown;
  documentValue: unknown;
}

export interface ReconcileResult {
  fills: FieldFill[];
  conflicts: FieldConflict[];
}

const isEmpty = (value: unknown): boolean =>
  value === undefined ||
  value === null ||
  (typeof value === 'string' && value.trim() === '');

/**
 * Reconcile a document's mapped fields against the current canonical record.
 * Pure: decides, per field, whether the document *fills* an empty canonical
 * value or *conflicts* with a set-and-differing one. It never overwrites — the
 * canonical record stays the source of truth and conflicts are surfaced for the
 * later document-vs-shipment validation rule to flag.
 */
export function reconcile(
  current: CanonicalFields,
  incoming: CanonicalFields,
): ReconcileResult {
  const fills: FieldFill[] = [];
  const conflicts: FieldConflict[] = [];

  for (const field of Object.keys(incoming) as CanonicalKey[]) {
    const documentValue = incoming[field];
    if (isEmpty(documentValue)) continue;

    const canonicalValue = current[field];
    if (isEmpty(canonicalValue)) {
      fills.push({ field, oldValue: undefined, newValue: documentValue });
    } else if (!valuesEqual(field, canonicalValue, documentValue)) {
      conflicts.push({ field, canonicalValue, documentValue });
    }
  }

  return { fills, conflicts };
}
