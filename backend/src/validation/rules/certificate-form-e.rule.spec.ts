import { Severity } from '../../../generated/prisma/client';
import { makeContext, makeShipment } from '../test-support';
import { CertificateFormERule } from './certificate-form-e.rule';

describe('CertificateFormERule', () => {
  const rule = new CertificateFormERule();

  it('flags a missing Form-E when the origin requires preferential certification', () => {
    const ctx = makeContext({
      shipment: makeShipment({ countryOfOrigin: 'CN', eformCertificate: null }),
    });
    expect(rule.evaluate(ctx)).toEqual([
      expect.objectContaining({
        issueType: 'certificate-form-e',
        severity: Severity.MEDIUM,
        field: 'eformCertificate',
      }),
    ]);
  });

  it('passes when a Form-E certificate is present', () => {
    const ctx = makeContext({
      shipment: makeShipment({
        countryOfOrigin: 'CN',
        eformCertificate: 'E-CN-2026-001',
      }),
    });
    expect(rule.evaluate(ctx)).toEqual([]);
  });

  it('does not require Form-E for a non-preferential origin', () => {
    const ctx = makeContext({
      shipment: makeShipment({ countryOfOrigin: 'US', eformCertificate: null }),
    });
    expect(rule.evaluate(ctx)).toEqual([]);
  });
});
