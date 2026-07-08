import { Injectable } from '@nestjs/common';
import { Severity } from '../../../generated/prisma/client';
import {
  isChapterCovered,
  isPlausibleOrigin,
} from '../reference/commodity-country.util';
import { hsChapterTitle } from '../reference/hs-code.util';
import { isKnownCountry } from '../reference/iso3166.util';
import {
  IssueDraft,
  ValidationContext,
  ValidationRule,
} from '../validation.types';
import { isBlank, quote } from './rule-helpers';

/**
 * Advisory plausibility check on the commodity↔origin pairing, backed by a UN
 * Comtrade export-flow snapshot. Only fires when both HS code and country are
 * present and valid and the HS chapter is one we cover — an origin outside the
 * chapter's well-known exporters is *unusual*, not wrong, so this is LOW/advisory
 * and never blocks. Malformed HS/country are other rules' concern.
 */
@Injectable()
export class CommodityCountryPlausibilityRule implements ValidationRule {
  evaluate(ctx: ValidationContext): IssueDraft[] {
    const { hsCode, countryOfOrigin } = ctx.shipment;
    if (isBlank(hsCode) || isBlank(countryOfOrigin)) return [];

    const code = hsCode as string;
    const origin = countryOfOrigin as string;
    if (!isKnownCountry(origin)) return [];
    if (!isChapterCovered(code)) return [];
    if (isPlausibleOrigin(code, origin)) return [];

    const chapter = hsChapterTitle(code);
    return [
      {
        issueType: 'commodity-country-plausibility',
        severity: Severity.LOW,
        field: 'countryOfOrigin',
        explanation: `Origin ${quote(origin)} is an unusual exporter for ${
          chapter ? quote(chapter) : 'this commodity'
        } based on UN Comtrade trade-flow context.`,
        suggestedAction:
          'Verify the country of origin and HS code are consistent with the goods.',
      },
    ];
  }
}
