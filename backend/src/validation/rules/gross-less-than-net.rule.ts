import { Injectable } from '@nestjs/common';
import { Severity } from '../../../generated/prisma/client';
import {
  IssueDraft,
  ValidationContext,
  ValidationRule,
} from '../validation.types';

/**
 * Physically-impossible-weight rule: gross weight must never be below net weight
 * (gross = net + packaging). A shipment where gross < net has bad data that would
 * mislead customs, so it is flagged CRITICAL (→ BLOCKED). Missing weights are a
 * different rule's concern; this one only fires when both are present.
 */
@Injectable()
export class GrossLessThanNetRule implements ValidationRule {
  evaluate(ctx: ValidationContext): IssueDraft[] {
    const { grossWeightKg, netWeightKg } = ctx.shipment;
    if (grossWeightKg === null || netWeightKg === null) {
      return [];
    }

    if (grossWeightKg.lessThan(netWeightKg)) {
      return [
        {
          issueType: 'gross-less-than-net',
          severity: Severity.CRITICAL,
          field: 'grossWeightKg',
          explanation: `Gross weight (${grossWeightKg.toString()} kg) is less than net weight (${netWeightKg.toString()} kg), which is physically impossible.`,
          suggestedAction:
            'Correct the gross/net weights; gross must be at least the net weight.',
        },
      ];
    }

    return [];
  }
}
