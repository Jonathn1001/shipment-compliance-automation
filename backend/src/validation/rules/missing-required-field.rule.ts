import { Injectable } from '@nestjs/common';
import { Severity } from '../../../generated/prisma/client';
import {
  IssueDraft,
  ValidationContext,
  ValidationRule,
} from '../validation.types';
import { isBlank } from './rule-helpers';

/**
 * Required identity fields that a shipment needs for readiness but which no
 * dedicated rule owns. (country-of-origin, bill-of-lading and invoice-value have
 * their own rules, so they are excluded here to avoid double-flagging.)
 */
const REQUIRED_FIELDS: {
  field: keyof ValidationContext['shipment'];
  label: string;
}[] = [
  { field: 'exporter', label: 'exporter' },
  { field: 'importer', label: 'importer' },
  { field: 'hsCode', label: 'HS code' },
  { field: 'goodsDescription', label: 'goods description' },
];

/** Flags each required identity field that is still missing (one issue per field). */
@Injectable()
export class MissingRequiredFieldRule implements ValidationRule {
  evaluate(ctx: ValidationContext): IssueDraft[] {
    return REQUIRED_FIELDS.filter(({ field }) =>
      isBlank(ctx.shipment[field] as string | null),
    ).map(({ field, label }) => ({
      issueType: 'missing-required-field',
      severity: Severity.HIGH,
      field,
      explanation: `Required field "${label}" is missing.`,
      suggestedAction: `Provide the ${label}, directly or via an ingested document.`,
    }));
  }
}
