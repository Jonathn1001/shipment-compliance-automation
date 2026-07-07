import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Validation engine tracer bullet (e2e): a shipment with gross < net validates to
 * BLOCKED with the CRITICAL issue raised, a readiness report requiring human
 * review, and the audit trail written; fixing the data and re-validating clears
 * the issue and returns the shipment to READY. Runs against the real Postgres.
 */
describe('Validation engine (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const create = (body: Record<string, unknown>) =>
    request(app.getHttpServer()).post('/shipments').send(body).expect(201);

  // An otherwise-clean shipment (passes every other rule) so a test can isolate a
  // single issue — the gross<net weights — without other rules changing the status.
  let counter = 0;
  const cleanBase = () => ({
    shipmentReference: `SAF-VAL-${Date.now()}-${counter++}`,
    exporter: 'Shenzhen Widgets Co',
    importer: 'Acme Importers Ltd',
    hsCode: '8471.30',
    goodsDescription: 'Laptop computers',
    countryOfOrigin: 'DE',
    billOfLadingNumber: 'BL-88231',
    invoiceValue: 1000,
    containerNumber: 'CSQU3054383',
    packagingType: 'Plastic',
  });

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

  it('gross < net -> validate -> BLOCKED with a CRITICAL issue and a report', async () => {
    const created = await create({
      ...cleanBase(),
      grossWeightKg: 900,
      netWeightKg: 1000,
    });
    const id = created.body.data.id;

    const res = await request(app.getHttpServer())
      .post(`/shipments/${id}/validate`)
      .expect(201);

    expect(res.body.data.status).toBe('BLOCKED');
    expect(res.body.data.report).toMatchObject({
      overallAssessment: 'BLOCKED',
      humanReviewRequired: true,
      criticalCount: 1,
      totalIssues: 1,
    });

    const issues = await request(app.getHttpServer())
      .get(`/shipments/${id}/issues`)
      .expect(200);
    expect(issues.body.data).toHaveLength(1);
    expect(issues.body.data[0]).toMatchObject({
      issueType: 'gross-less-than-net',
      severity: 'CRITICAL',
      field: 'grossWeightKg',
      status: 'OPEN',
    });
    expect(issues.body.data[0].explanation).toBeTruthy();
    expect(issues.body.data[0].suggestedAction).toBeTruthy();

    const shipment = await request(app.getHttpServer())
      .get(`/shipments/${id}`)
      .expect(200);
    expect(shipment.body.data.currentStatus).toBe('BLOCKED');
  });

  it('exposes the readiness report and audit log via the read endpoints', async () => {
    const created = await create({
      shipmentReference: 'SAF-VAL-2',
      grossWeightKg: 800,
      netWeightKg: 1000,
    });
    const id = created.body.data.id;
    await request(app.getHttpServer())
      .post(`/shipments/${id}/validate`)
      .expect(201);

    const report = await request(app.getHttpServer())
      .get(`/shipments/${id}/readiness-report`)
      .expect(200);
    expect(report.body.data).toMatchObject({
      statusSnapshot: 'BLOCKED',
      humanReviewRequired: true,
    });

    const audit = await request(app.getHttpServer())
      .get(`/shipments/${id}/audit-log`)
      .expect(200);
    const actions = audit.body.data.map((a: { action: string }) => a.action);
    expect(actions).toEqual(
      expect.arrayContaining([
        'VALIDATION_RUN',
        'STATUS_CHANGED',
        'REPORT_GENERATED',
      ]),
    );
  });

  it('re-validating after a fix resolves the issue and returns to READY', async () => {
    const created = await create({
      ...cleanBase(),
      grossWeightKg: 900,
      netWeightKg: 1000,
    });
    const id = created.body.data.id;

    await request(app.getHttpServer())
      .post(`/shipments/${id}/validate`)
      .expect(201);
    // Fix the data directly, then re-validate.
    await prisma.shipment.update({
      where: { id },
      data: { grossWeightKg: 1000 },
    });

    const res = await request(app.getHttpServer())
      .post(`/shipments/${id}/validate`)
      .expect(201);
    expect(res.body.data.status).toBe('READY');

    // The previously-open issue is now RESOLVED (retained for history), so the
    // active-issue endpoint no longer lists it as OPEN.
    const issues = await request(app.getHttpServer())
      .get(`/shipments/${id}/issues`)
      .expect(200);
    const open = issues.body.data.filter(
      (i: { status: string }) => i.status === 'OPEN',
    );
    expect(open).toHaveLength(0);
  });
});
