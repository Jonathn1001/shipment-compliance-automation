import { Injectable } from '@nestjs/common';
import { Severity } from '../../../generated/prisma/client';
import { CanonicalKey } from '../../document/canonical';
import { valuesEqual } from '../../document/canonical-compare';
import {
  IssueDraft,
  ValidationContext,
  ValidationRule,
} from '../validation.types';
import { quote } from './rule-helpers';

/**
 * A document value that disagrees with an already-set canonical value is a
 * mismatch (the reconciler preserved the canonical value rather than overwriting
 * it). Each such disagreement is flagged HIGH so an operator resolves which
 * source is correct. An empty canonical value is a fill, not a mismatch.
 */
@Injectable()
export class DocumentShipmentMismatchRule implements ValidationRule {
  evaluate(ctx: ValidationContext): IssueDraft[] {
    const shipmentCanonical = ctx.shipment as unknown as Record<
      CanonicalKey,
      unknown
    >;

    return (Object.keys(ctx.documentValues) as CanonicalKey[]).flatMap(
      (field) => {
        const documentValue = ctx.documentValues[field];
        const canonicalValue = shipmentCanonical[field];
        if (isEmpty(documentValue) || isEmpty(canonicalValue)) return [];
        if (valuesEqual(field, canonicalValue, documentValue)) return [];

        return [
          {
            issueType: 'document-shipment-mismatch',
            severity: Severity.HIGH,
            field,
            explanation: `Document value for "${field}" (${quote(documentValue)}) disagrees with the shipment record (${quote(canonicalValue)}).`,
            suggestedAction: `Reconcile "${field}": confirm whether the document or the shipment record is correct.`,
          },
        ];
      },
    );
  }
}

const isEmpty = (value: unknown): boolean =>
  value === null ||
  value === undefined ||
  (typeof value === 'string' && value.trim() === '');
