import { Injectable } from '@nestjs/common';
import { Severity } from '../../../generated/prisma/client';
import {
  IssueDraft,
  ValidationContext,
  ValidationRule,
} from '../validation.types';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * A shipment whose arrival date is older than the configured review window is
 * stale and surfaced for attention (demurrage risk, missed clearance deadlines).
 */
@Injectable()
export class ArrivalDateWindowRule implements ValidationRule {
  evaluate(ctx: ValidationContext): IssueDraft[] {
    const { arrivalDate } = ctx.shipment;
    if (arrivalDate === null) return [];

    const ageDays = (ctx.now.getTime() - arrivalDate.getTime()) / MS_PER_DAY;
    if (ageDays <= ctx.thresholds.reviewWindowDays) return [];

    return [
      {
        issueType: 'arrival-date-window',
        severity: Severity.MEDIUM,
        field: 'arrivalDate',
        explanation: `Arrival date is ${Math.floor(ageDays)} days old, beyond the ${ctx.thresholds.reviewWindowDays}-day review window.`,
        suggestedAction:
          'Confirm the shipment is still active and update its status.',
      },
    ];
  }
}
