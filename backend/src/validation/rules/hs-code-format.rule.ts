import { Injectable } from '@nestjs/common';
import { Severity } from '../../../generated/prisma/client';
import { isKnownHsChapter, isValidHsFormat } from '../reference/hs-code.util';
import {
  IssueDraft,
  ValidationContext,
  ValidationRule,
} from '../validation.types';
import { isBlank } from './rule-helpers';

/**
 * When an HS code is present, it must be well-formed (6-10 digits) and its
 * chapter must exist in the WCO nomenclature. A missing HS code is the
 * missing-required-field rule's concern, not this one.
 */
@Injectable()
export class HsCodeFormatRule implements ValidationRule {
  evaluate(ctx: ValidationContext): IssueDraft[] {
    const { hsCode } = ctx.shipment;
    if (isBlank(hsCode)) return [];

    const code = hsCode as string;
    if (isValidHsFormat(code) && isKnownHsChapter(code)) return [];

    return [
      {
        issueType: 'hs-code-format',
        severity: Severity.HIGH,
        field: 'hsCode',
        explanation: `HS code "${code}" is not a valid, known classification (bad format or unknown chapter).`,
        suggestedAction:
          'Correct the HS code to a valid WCO classification (6-10 digits).',
      },
    ];
  }
}
