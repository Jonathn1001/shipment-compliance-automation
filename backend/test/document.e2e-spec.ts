import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Document ingestion e2e: an ingested document fills empty canonical fields but
 * never overwrites a set-and-differing one (the conflict is surfaced instead),
 * and both DOCUMENT_INGESTED and per-field FIELD_UPDATED audit entries are
 * written. Runs against the real Postgres from test/run-e2e.mjs.
 */
describe('Document ingestion (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const createShipment = (body: Record<string, unknown>) =>
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

  it('fills empty canonical fields from an ingested document', async () => {
    const created = await createShipment({ shipmentReference: 'SAF-ING-1' });
    const id = created.body.data.id;

    const res = await request(app.getHttpServer())
      .post(`/shipments/${id}/documents`)
      .send({
        documentType: 'COMMERCIAL_INVOICE',
        sourceType: 'JSON',
        payload: {
          seller: 'Shenzhen Widgets Co',
          buyer: 'Acme Importers Ltd',
          hs_code: '8471.30',
          total_value: 500.25,
          currency: 'USD',
        },
      })
      .expect(201);

    expect(res.body.data.reconciliation.filledFields).toEqual(
      expect.arrayContaining([
        'exporter',
        'importer',
        'hsCode',
        'invoiceValue',
        'currency',
      ]),
    );
    expect(res.body.data.reconciliation.conflicts).toEqual([]);

    const shipment = await request(app.getHttpServer())
      .get(`/shipments/${id}`)
      .expect(200);
    expect(shipment.body.data).toMatchObject({
      exporter: 'Shenzhen Widgets Co',
      importer: 'Acme Importers Ltd',
      hsCode: '8471.30',
      invoiceValue: '500.25',
      currency: 'USD',
    });
  });

  it('preserves a set-and-differing value (no overwrite) and surfaces the conflict', async () => {
    const created = await createShipment({
      shipmentReference: 'SAF-ING-2',
      importer: 'Original Importer',
    });
    const id = created.body.data.id;

    const res = await request(app.getHttpServer())
      .post(`/shipments/${id}/documents`)
      .send({
        documentType: 'COMMERCIAL_INVOICE',
        sourceType: 'JSON',
        payload: { buyer: 'Different Importer', currency: 'EUR' },
      })
      .expect(201);

    // currency was empty -> filled; importer was set-and-differing -> conflict, not filled.
    expect(res.body.data.reconciliation.filledFields).toContain('currency');
    expect(res.body.data.reconciliation.filledFields).not.toContain('importer');
    expect(res.body.data.reconciliation.conflicts).toEqual([
      {
        field: 'importer',
        canonicalValue: 'Original Importer',
        documentValue: 'Different Importer',
      },
    ]);

    const shipment = await request(app.getHttpServer())
      .get(`/shipments/${id}`)
      .expect(200);
    expect(shipment.body.data.importer).toBe('Original Importer');
    expect(shipment.body.data.currency).toBe('EUR');
  });

  it('writes DOCUMENT_INGESTED and FIELD_UPDATED audit entries', async () => {
    const created = await createShipment({ shipmentReference: 'SAF-ING-3' });
    const id = created.body.data.id;

    await request(app.getHttpServer())
      .post(`/shipments/${id}/documents`)
      .send({
        documentType: 'PACKING_LIST',
        sourceType: 'JSON',
        payload: { gross_weight_kg: 1040.25, packaging_type: 'Wood' },
      })
      .expect(201);

    const actions = (
      await prisma.auditLog.findMany({ where: { shipmentId: id } })
    ).map((a) => a.action);
    expect(actions).toContain('DOCUMENT_INGESTED');
    expect(actions).toContain('FIELD_UPDATED');
  });

  it('rejects a bad ingestion envelope with 422 { error }', async () => {
    const created = await createShipment({ shipmentReference: 'SAF-ING-4' });
    const id = created.body.data.id;

    const res = await request(app.getHttpServer())
      .post(`/shipments/${id}/documents`)
      .send({
        documentType: 'NOT_A_REAL_TYPE',
        sourceType: 'JSON',
        payload: {},
      })
      .expect(422);

    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toMatchObject({
      statusCode: 422,
      code: 'SCA-VAL-001',
    });
  });

  it('returns 404 { error } when ingesting into a missing shipment', async () => {
    const res = await request(app.getHttpServer())
      .post('/shipments/does-not-exist/documents')
      .send({
        documentType: 'COMMERCIAL_INVOICE',
        sourceType: 'JSON',
        payload: { currency: 'USD' },
      })
      .expect(404);

    expect(res.body.error).toMatchObject({
      statusCode: 404,
      code: 'SCA-SHIP-001',
    });
  });
});
