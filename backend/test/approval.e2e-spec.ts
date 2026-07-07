import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Reviewer approval (e2e). A shipment that is not BLOCKED can be approved and
 * moves to APPROVED with a SHIPMENT_APPROVED audit entry; approving a BLOCKED
 * shipment is rejected with 409 and leaves the shipment and audit trail unchanged.
 */
describe('Approval (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

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

  it('approves a shipment that is not BLOCKED -> APPROVED with an audit entry', async () => {
    const created = await create({ shipmentReference: 'SAF-APR-1' });
    const id = created.body.data.id;

    const res = await request(app.getHttpServer())
      .post(`/shipments/${id}/approve`)
      .set('x-actor', 'reviewer@safiri')
      .expect(201);
    expect(res.body.data.currentStatus).toBe('APPROVED');

    const audit = await prisma.auditLog.findMany({
      where: { shipmentId: id, action: 'SHIPMENT_APPROVED' },
    });
    expect(audit).toHaveLength(1);
    expect(audit[0].actor).toBe('reviewer@safiri');
  });

  it('rejects approval of a BLOCKED shipment with 409 and no side effects', async () => {
    const created = await create({
      shipmentReference: 'SAF-APR-2',
      grossWeightKg: 900,
      netWeightKg: 1000,
    });
    const id = created.body.data.id;
    await request(app.getHttpServer())
      .post(`/shipments/${id}/validate`)
      .expect(201);

    const res = await request(app.getHttpServer())
      .post(`/shipments/${id}/approve`)
      .expect(409);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toMatchObject({ statusCode: 409 });

    // Unchanged: still BLOCKED, no SHIPMENT_APPROVED recorded.
    const shipment = await request(app.getHttpServer())
      .get(`/shipments/${id}`)
      .expect(200);
    expect(shipment.body.data.currentStatus).toBe('BLOCKED');
    const approved = await prisma.auditLog.findMany({
      where: { shipmentId: id, action: 'SHIPMENT_APPROVED' },
    });
    expect(approved).toHaveLength(0);
  });
});
