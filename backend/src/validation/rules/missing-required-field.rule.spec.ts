import { Severity } from '../../../generated/prisma/client';
import { makeContext, makeShipment } from '../test-support';
import { MissingRequiredFieldRule } from './missing-required-field.rule';

describe('MissingRequiredFieldRule', () => {
  const rule = new MissingRequiredFieldRule();

  it('flags each missing required identity field as HIGH', () => {
    const ctx = makeContext({
      shipment: makeShipment({ exporter: null, importer: null }),
    });
    const issues = rule.evaluate(ctx);

    const fields = issues.map((i) => i.field);
    expect(fields).toEqual(expect.arrayContaining(['exporter', 'importer']));
    expect(issues.every((i) => i.severity === Severity.HIGH)).toBe(true);
    expect(issues.every((i) => i.issueType === 'missing-required-field')).toBe(
      true,
    );
  });

  it('passes when all required fields are present', () => {
    const ctx = makeContext({
      shipment: makeShipment({
        exporter: 'Shenzhen Widgets Co',
        importer: 'Acme Importers Ltd',
        hsCode: '8471.30',
        goodsDescription: 'Laptops',
      }),
    });
    expect(rule.evaluate(ctx)).toEqual([]);
  });
});
