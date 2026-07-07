import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * Error contract (e2e). Every failure carries a stable, catalogued `code` (the
 * client branches on the code, not the human message), input validation is 422
 * with per-field `details`, and domain faults map to their SCA-* code.
 */
describe('Error contract (e2e)', () => {
  let app: INestApplication;
  let counter = 0;

  const create = (body: Record<string, unknown>) =>
    request(app.getHttpServer()).post('/shipments').send(body).expect(201);

  const woodNoIspm15 = () => ({
    shipmentReference: `SAF-ERR-${Date.now()}-${counter++}`,
    packagingType: 'Wooden crate',
    ispm15Certified: false,
  });

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('a missing shipment is 404 with code SCA-SHIP-001', async () => {
    const res = await request(app.getHttpServer())
      .get('/shipments/does-not-exist')
      .expect(404);
    expect(res.body.error).toMatchObject({
      statusCode: 404,
      code: 'SCA-SHIP-001',
    });
    expect(res.body).not.toHaveProperty('data');
  });

  it('approving a BLOCKED shipment is 409 with code SCA-SHIP-002', async () => {
    const created = await create(woodNoIspm15());
    const id = created.body.data.id;
    await request(app.getHttpServer())
      .post(`/shipments/${id}/validate`)
      .expect(201);

    const res = await request(app.getHttpServer())
      .post(`/shipments/${id}/approve`)
      .expect(409);
    expect(res.body.error).toMatchObject({
      statusCode: 409,
      code: 'SCA-SHIP-002',
    });
  });

  it('an invalid body is 422 (VALIDATION_ERROR) with per-field details', async () => {
    const res = await request(app.getHttpServer())
      .post('/shipments')
      .send({ importer: 'no reference supplied' })
      .expect(422);
    expect(res.body.error).toMatchObject({
      statusCode: 422,
      code: 'SCA-VAL-001',
    });
    // The offending field is reported structurally, not only in prose.
    const fields = (res.body.error.details as { field: string }[]).map(
      (d) => d.field,
    );
    expect(fields).toContain('shipmentReference');
  });

  it('an unknown query enum is 422 (VALIDATION_ERROR)', async () => {
    const created = await create(woodNoIspm15());
    const id = created.body.data.id;
    const res = await request(app.getHttpServer())
      .get(`/shipments/${id}/issues`)
      .query({ severity: 'URGENT' })
      .expect(422);
    expect(res.body.error).toMatchObject({
      statusCode: 422,
      code: 'SCA-VAL-001',
    });
  });
});
