import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Full rule-set fan-out (e2e). Exercises the three readiness outcomes through the
 * wired engine: a clean shipment -> READY, wood packaging without ISPM15 ->
 * BLOCKED, and a document-vs-shipment mismatch -> NEEDS_REVIEW; plus that a WAIVED
 * issue is not re-raised on re-validation. Runs against the real Postgres.
 */
describe('Full rule set (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let counter = 0;

  // A shipment that passes every rule. Unique reference per call (dup rule).
  const cleanBody = () => ({
    shipmentReference: `SAF-CLEAN-${Date.now()}-${counter++}`,
    exporter: 'Shenzhen Widgets Co',
    importer: 'Acme Importers Ltd',
    hsCode: '8471.30',
    goodsDescription: 'Laptop computers',
    countryOfOrigin: 'DE',
    billOfLadingNumber: 'BL-88231',
    invoiceValue: 1000,
    currency: 'USD',
    containerNumber: 'CSQU3054383',
    grossWeightKg: 1000,
    netWeightKg: 1000,
    packagingType: 'Plastic',
  });

  const create = (body: Record<string, unknown>) =>
    request(app.getHttpServer()).post('/shipments').send(body).expect(201);

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    prisma = app.get(PrismaService);
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('a clean shipment validates to READY with no issues', async () => {
    const created = await create(cleanBody());
    const id = created.body.data.id;

    const res = await request(app.getHttpServer())
      .post(`/shipments/${id}/validate`)
      .expect(201);
    expect(res.body.data.status).toBe('READY');
    expect(res.body.data.report).toMatchObject({
      totalIssues: 0,
      overallAssessment: 'READY_TO_PROCEED',
    });
  });

  it('wood packaging without ISPM15 validates to BLOCKED', async () => {
    const created = await create({
      ...cleanBody(),
      packagingType: 'Wooden crate',
      ispm15Certified: false,
    });
    const id = created.body.data.id;

    const res = await request(app.getHttpServer())
      .post(`/shipments/${id}/validate`)
      .expect(201);
    expect(res.body.data.status).toBe('BLOCKED');

    const issues = await request(app.getHttpServer())
      .get(`/shipments/${id}/issues`)
      .expect(200);
    const types = issues.body.data.map(
      (i: { issueType: string }) => i.issueType,
    );
    expect(types).toContain('wood-packaging-ispm15');
  });

  it('a document-vs-shipment mismatch validates to NEEDS_REVIEW (HIGH, no critical)', async () => {
    const created = await create(cleanBody());
    const id = created.body.data.id;

    // Ingest a document whose importer disagrees with the (set) canonical importer.
    await request(app.getHttpServer())
      .post(`/shipments/${id}/documents`)
      .send({
        documentType: 'COMMERCIAL_INVOICE',
        sourceType: 'JSON',
        payload: { buyer: 'Globex Trading' },
      })
      .expect(201);

    const res = await request(app.getHttpServer())
      .post(`/shipments/${id}/validate`)
      .expect(201);
    expect(res.body.data.status).toBe('NEEDS_REVIEW');

    const issues = await request(app.getHttpServer())
      .get(`/shipments/${id}/issues`)
      .expect(200);
    const mismatch = issues.body.data.find(
      (i: { issueType: string }) =>
        i.issueType === 'document-shipment-mismatch',
    );
    expect(mismatch).toMatchObject({ severity: 'HIGH', field: 'importer' });
  });

  it('duplicate reference is CRITICAL for both shipments sharing it', async () => {
    const ref = `SAF-DUP-${Date.now()}`;
    const a = await create({ ...cleanBody(), shipmentReference: ref });
    await create({ ...cleanBody(), shipmentReference: ref });

    const res = await request(app.getHttpServer())
      .post(`/shipments/${a.body.data.id}/validate`)
      .expect(201);
    expect(res.body.data.status).toBe('BLOCKED');
    const issues = await request(app.getHttpServer())
      .get(`/shipments/${a.body.data.id}/issues`)
      .expect(200);
    const types = issues.body.data.map(
      (i: { issueType: string }) => i.issueType,
    );
    expect(types).toContain('duplicate-shipment-reference');
  });

  it('a WAIVED issue is not re-raised on re-validation', async () => {
    // Missing country of origin -> a single MEDIUM issue.
    const created = await create({
      ...cleanBody(),
      countryOfOrigin: undefined,
    });
    const id = created.body.data.id;

    await request(app.getHttpServer())
      .post(`/shipments/${id}/validate`)
      .expect(201);
    const first = await prisma.validationIssue.findFirst({
      where: { shipmentId: id, issueType: 'missing-country-of-origin' },
    });
    expect(first).not.toBeNull();

    // Operator waives it.
    await prisma.validationIssue.update({
      where: { id: first!.id },
      data: { status: 'WAIVED' },
    });

    // Re-validate — the waived issue must survive as WAIVED, not be re-raised OPEN.
    await request(app.getHttpServer())
      .post(`/shipments/${id}/validate`)
      .expect(201);
    const after = await prisma.validationIssue.findMany({
      where: { shipmentId: id, issueType: 'missing-country-of-origin' },
    });
    expect(after).toHaveLength(1);
    expect(after[0].status).toBe('WAIVED');
  });

  it('filters issues by severity via ?severity= and rejects an unknown value', async () => {
    // A shipment that raises issues of >=2 severities: wood crate w/o ISPM15
    // (CRITICAL) plus a missing country of origin (non-critical).
    const created = await create({
      ...cleanBody(),
      countryOfOrigin: undefined,
      packagingType: 'Wooden crate',
      ispm15Certified: false,
    });
    const id = created.body.data.id;

    await request(app.getHttpServer())
      .post(`/shipments/${id}/validate`)
      .expect(201);

    const all = await request(app.getHttpServer())
      .get(`/shipments/${id}/issues`)
      .expect(200);
    const severities = new Set(
      all.body.data.map((i: { severity: string }) => i.severity),
    );
    expect(severities.has('CRITICAL')).toBe(true);
    expect(severities.size).toBeGreaterThan(1); // at least one non-critical too

    const critical = await request(app.getHttpServer())
      .get(`/shipments/${id}/issues`)
      .query({ severity: 'CRITICAL' })
      .expect(200);
    expect(critical.body.data.length).toBeGreaterThan(0);
    expect(critical.body.data.length).toBeLessThan(all.body.data.length);
    expect(
      critical.body.data.every(
        (i: { severity: string }) => i.severity === 'CRITICAL',
      ),
    ).toBe(true);

    // An unknown severity is rejected by validation, not silently ignored.
    await request(app.getHttpServer())
      .get(`/shipments/${id}/issues`)
      .query({ severity: 'URGENT' })
      .expect(400);
  });

  it('waiving the only issue clears the readiness block (waiver unblocks)', async () => {
    // Otherwise-clean shipment with a single MEDIUM issue -> NEEDS_REVIEW.
    const created = await create({
      ...cleanBody(),
      countryOfOrigin: undefined,
    });
    const id = created.body.data.id;

    const firstRun = await request(app.getHttpServer())
      .post(`/shipments/${id}/validate`)
      .expect(201);
    expect(firstRun.body.data.status).toBe('NEEDS_REVIEW');

    const issue = await prisma.validationIssue.findFirst({
      where: { shipmentId: id, issueType: 'missing-country-of-origin' },
    });
    await prisma.validationIssue.update({
      where: { id: issue!.id },
      data: { status: 'WAIVED' },
    });

    // The accepted risk must no longer drive status or the report.
    const res = await request(app.getHttpServer())
      .post(`/shipments/${id}/validate`)
      .expect(201);
    expect(res.body.data.status).toBe('READY');
    expect(res.body.data.report).toMatchObject({
      overallAssessment: 'READY_TO_PROCEED',
      totalIssues: 0,
      humanReviewRequired: false,
    });
  });
});
