import { Injectable } from '@nestjs/common';
import { Severity } from '../../../generated/prisma/client';
import {
  IssueDraft,
  ValidationContext,
  ValidationRule,
} from '../validation.types';
import { isBlank } from './rule-helpers';

/** A shipment without a bill of lading number is undocumented in transit. */
@Injectable()
export class MissingBillOfLadingRule implements ValidationRule {
  evaluate(ctx: ValidationContext): IssueDraft[] {
    if (!isBlank(ctx.shipment.billOfLadingNumber)) return [];
    return [
      {
        issueType: 'missing-bill-of-lading',
        severity: Severity.HIGH,
        field: 'billOfLadingNumber',
        explanation: 'Bill of lading number is missing.',
        suggestedAction:
          'Provide the bill of lading number from the carrier document.',
      },
    ];
  }
}
