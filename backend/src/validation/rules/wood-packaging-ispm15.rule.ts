import { Injectable } from '@nestjs/common';
import { Severity } from '../../../generated/prisma/client';
import {
  IssueDraft,
  ValidationContext,
  ValidationRule,
} from '../validation.types';
import { isBlank } from './rule-helpers';

/**
 * Wood packaging must carry ISPM15 treatment certification or customs will reject
 * the shipment. If the packaging is wood and it is not certified (false or
 * unknown), that is a blocking (CRITICAL) compliance gap.
 */
@Injectable()
export class WoodPackagingIspm15Rule implements ValidationRule {
  evaluate(ctx: ValidationContext): IssueDraft[] {
    const { packagingType, ispm15Certified } = ctx.shipment;
    if (isBlank(packagingType)) return [];
    if (!/\bwood|timber|pallet|crate\b/i.test(packagingType as string))
      return [];
    if (ispm15Certified === true) return [];

    return [
      {
        issueType: 'wood-packaging-ispm15',
        severity: Severity.CRITICAL,
        field: 'ispm15Certified',
        explanation: `Wood packaging ("${packagingType as string}") is not ISPM15-certified; customs would reject it.`,
        suggestedAction:
          'Obtain ISPM15 heat-treatment/fumigation certification for the wood packaging.',
      },
    ];
  }
}
