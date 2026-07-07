import { Injectable } from '@nestjs/common';
import { Severity } from '../../../generated/prisma/client';
import {
  IssueDraft,
  ValidationContext,
  ValidationRule,
} from '../validation.types';

/**
 * The invoice value is the customs valuation basis: it must be present and
 * positive. A missing or non-positive value is a valuation problem that would
 * surface at customs, so it is flagged before submission.
 */
@Injectable()
export class InvoiceValueRule implements ValidationRule {
  evaluate(ctx: ValidationContext): IssueDraft[] {
    const { invoiceValue } = ctx.shipment;
    if (invoiceValue !== null && invoiceValue.greaterThan(0)) return [];

    const reason =
      invoiceValue === null ? 'is missing' : 'is not a positive amount';
    return [
      {
        issueType: 'invoice-value',
        severity: Severity.HIGH,
        field: 'invoiceValue',
        explanation: `Invoice value ${reason}.`,
        suggestedAction:
          'Provide a positive invoice value from the commercial invoice.',
      },
    ];
  }
}
