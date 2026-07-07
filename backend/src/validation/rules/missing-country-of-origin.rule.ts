import { Injectable } from '@nestjs/common';
import { Severity } from '../../../generated/prisma/client';
import {
  IssueDraft,
  ValidationContext,
  ValidationRule,
} from '../validation.types';
import { isBlank } from './rule-helpers';

/** Country of origin is needed for duty/preferential treatment; flag if missing. */
@Injectable()
export class MissingCountryOfOriginRule implements ValidationRule {
  evaluate(ctx: ValidationContext): IssueDraft[] {
    if (!isBlank(ctx.shipment.countryOfOrigin)) return [];
    return [
      {
        issueType: 'missing-country-of-origin',
        severity: Severity.MEDIUM,
        field: 'countryOfOrigin',
        explanation: 'Country of origin is missing.',
        suggestedAction:
          'Provide the country of origin (needed for duty and origin rules).',
      },
    ];
  }
}
