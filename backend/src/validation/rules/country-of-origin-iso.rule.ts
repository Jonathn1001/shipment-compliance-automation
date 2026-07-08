import { Injectable } from '@nestjs/common';
import { Severity } from '../../../generated/prisma/client';
import { isKnownCountry } from '../reference/iso3166.util';
import {
  IssueDraft,
  ValidationContext,
  ValidationRule,
} from '../validation.types';
import { isBlank, quote } from './rule-helpers';

/**
 * When a country of origin is present it must be a known ISO 3166-1 country
 * (alpha-2 code or English name). A missing country is the
 * missing-country-of-origin rule's concern, not this one.
 */
@Injectable()
export class CountryOfOriginIsoRule implements ValidationRule {
  evaluate(ctx: ValidationContext): IssueDraft[] {
    const { countryOfOrigin } = ctx.shipment;
    if (isBlank(countryOfOrigin)) return [];
    if (isKnownCountry(countryOfOrigin as string)) return [];

    return [
      {
        issueType: 'country-of-origin-iso',
        severity: Severity.HIGH,
        field: 'countryOfOrigin',
        explanation: `Country of origin ${quote(countryOfOrigin)} is not a known ISO 3166-1 country.`,
        suggestedAction:
          'Correct the country of origin to a valid ISO 3166-1 alpha-2 code (e.g. CN, DE).',
      },
    ];
  }
}
