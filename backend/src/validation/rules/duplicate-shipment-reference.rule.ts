import { Injectable } from '@nestjs/common';
import { Severity } from '../../../generated/prisma/client';
import {
  IssueDraft,
  ValidationContext,
  ValidationRule,
} from '../validation.types';
import { quote } from './rule-helpers';

/**
 * The shipment reference must be unique across records. Because the reference is
 * intentionally not DB-unique (duplicates must persist to be caught), the engine
 * supplies the count of other shipments sharing it; a non-zero count is a
 * CRITICAL record-integrity problem.
 */
@Injectable()
export class DuplicateShipmentReferenceRule implements ValidationRule {
  evaluate(ctx: ValidationContext): IssueDraft[] {
    if (ctx.otherShipmentsWithSameReference <= 0) return [];
    return [
      {
        issueType: 'duplicate-shipment-reference',
        severity: Severity.CRITICAL,
        field: 'shipmentReference',
        explanation: `Shipment reference ${quote(ctx.shipment.shipmentReference)} is used by ${ctx.otherShipmentsWithSameReference} other shipment(s).`,
        suggestedAction:
          'Resolve the duplicate: correct the reference or merge the duplicate records.',
      },
    ];
  }
}
