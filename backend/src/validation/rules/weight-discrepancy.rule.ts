import { Injectable } from '@nestjs/common';
import { Severity } from '../../../generated/prisma/client';
import {
  IssueDraft,
  ValidationContext,
  ValidationRule,
} from '../validation.types';

/**
 * Suspicious gross/net weight gap: when both weights are present and gross >= net
 * (gross < net is the CRITICAL rule's concern), a difference exceeding the
 * configured tolerance percentage is flagged as a warning for a second look.
 */
@Injectable()
export class WeightDiscrepancyRule implements ValidationRule {
  evaluate(ctx: ValidationContext): IssueDraft[] {
    const { grossWeightKg, netWeightKg } = ctx.shipment;
    if (grossWeightKg === null || netWeightKg === null) return [];
    if (grossWeightKg.lessThan(netWeightKg)) return [];
    if (netWeightKg.isZero()) return [];

    const diffPct = grossWeightKg
      .minus(netWeightKg)
      .dividedBy(netWeightKg)
      .times(100);
    if (diffPct.lessThanOrEqualTo(ctx.thresholds.weightTolerancePct)) return [];

    return [
      {
        issueType: 'weight-discrepancy',
        severity: Severity.MEDIUM,
        field: 'grossWeightKg',
        explanation: `Gross vs net weight differs by ${diffPct.toFixed(1)}%, beyond the ${ctx.thresholds.weightTolerancePct}% tolerance.`,
        suggestedAction:
          'Re-check the gross and net weights against the packing list.',
      },
    ];
  }
}
