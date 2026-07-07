import { Injectable } from '@nestjs/common';
import { Severity } from '../../../generated/prisma/client';
import { isValidContainerNumber } from '../reference/iso6346.util';
import {
  IssueDraft,
  ValidationContext,
  ValidationRule,
} from '../validation.types';
import { isBlank } from './rule-helpers';

/**
 * When a container number is present it must be a valid ISO-6346 number (catches
 * data-entry errors). Absence is not flagged — the shipment may be non-
 * containerized (e.g. break-bulk or air freight).
 */
@Injectable()
export class ContainerNumberFormatRule implements ValidationRule {
  evaluate(ctx: ValidationContext): IssueDraft[] {
    const { containerNumber } = ctx.shipment;
    if (isBlank(containerNumber)) return [];
    if (isValidContainerNumber(containerNumber as string)) return [];

    return [
      {
        issueType: 'container-number-format',
        severity: Severity.MEDIUM,
        field: 'containerNumber',
        explanation: `Container number "${containerNumber as string}" is not a valid ISO-6346 number.`,
        suggestedAction:
          'Correct the container number (4 letters + 7 digits with a valid check digit).',
      },
    ];
  }
}
