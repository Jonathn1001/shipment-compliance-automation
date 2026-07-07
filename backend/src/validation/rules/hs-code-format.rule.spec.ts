import { Severity } from '../../../generated/prisma/client';
import { makeContext, makeShipment } from '../test-support';
import { HsCodeFormatRule } from './hs-code-format.rule';

describe('HsCodeFormatRule', () => {
  const rule = new HsCodeFormatRule();

  it('flags an invalid HS code format as HIGH on the hsCode field', () => {
    const ctx = makeContext({ shipment: makeShipment({ hsCode: '84' }) });
    const issues = rule.evaluate(ctx);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      issueType: 'hs-code-format',
      severity: Severity.HIGH,
      field: 'hsCode',
    });
  });

  it('flags a well-formed code in an unknown chapter', () => {
    const ctx = makeContext({ shipment: makeShipment({ hsCode: '7715.00' }) });
    expect(rule.evaluate(ctx)).toHaveLength(1);
  });

  it('passes for a valid, known HS code', () => {
    const ctx = makeContext({ shipment: makeShipment({ hsCode: '8471.30' }) });
    expect(rule.evaluate(ctx)).toEqual([]);
  });

  it('does not flag when hsCode is absent (a missing-field rule owns that)', () => {
    const ctx = makeContext({ shipment: makeShipment({ hsCode: null }) });
    expect(rule.evaluate(ctx)).toEqual([]);
  });
});
