import { Injectable } from '@nestjs/common';
import { Severity } from '../../../generated/prisma/client';
import { isKnownCurrency } from '../reference/iso4217.util';
import {
  IssueDraft,
  ValidationContext,
  ValidationRule,
} from '../validation.types';
import { isBlank, quote } from './rule-helpers';

/**
 * When an invoice currency is present it must be a known ISO 4217 code (catches
 * data-entry errors and mis-mapped fields). Absence is not flagged here.
 */
@Injectable()
export class CurrencyIsoRule implements ValidationRule {
  evaluate(ctx: ValidationContext): IssueDraft[] {
    const { currency } = ctx.shipment;
    if (isBlank(currency)) return [];
    if (isKnownCurrency(currency as string)) return [];

    return [
      {
        issueType: 'currency-iso',
        severity: Severity.MEDIUM,
        field: 'currency',
        explanation: `Currency ${quote(currency)} is not a known ISO 4217 code.`,
        suggestedAction:
          'Correct the currency to a valid ISO 4217 alpha-3 code (e.g. USD, EUR).',
      },
    ];
  }
}
