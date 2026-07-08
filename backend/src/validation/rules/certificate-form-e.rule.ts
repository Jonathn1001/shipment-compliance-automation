import { Injectable } from '@nestjs/common';
import { Severity } from '../../../generated/prisma/client';
import {
  IssueDraft,
  ValidationContext,
  ValidationRule,
} from '../validation.types';
import { isBlank, quote } from './rule-helpers';

/**
 * Origins with a preferential-tariff agreement require a Certificate of Origin
 * (Form E for the ASEAN–China FTA) to claim preferential duty. When the origin is
 * such a country and no Form-E certificate is recorded, flag the paperwork gap.
 * (Mocked list; not legal advice.)
 */
const FORM_E_ORIGINS = new Set(['CN', 'CHINA']);

@Injectable()
export class CertificateFormERule implements ValidationRule {
  evaluate(ctx: ValidationContext): IssueDraft[] {
    const { countryOfOrigin, eformCertificate } = ctx.shipment;
    if (isBlank(countryOfOrigin)) return [];
    if (!FORM_E_ORIGINS.has((countryOfOrigin as string).trim().toUpperCase()))
      return [];
    if (!isBlank(eformCertificate)) return [];

    return [
      {
        issueType: 'certificate-form-e',
        severity: Severity.MEDIUM,
        field: 'eformCertificate',
        explanation: `Origin ${quote(countryOfOrigin)} is expected to carry a Form-E certificate of origin, but none is recorded.`,
        suggestedAction:
          'Obtain the Form-E certificate of origin to claim preferential duty.',
      },
    ];
  }
}
