import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Walking-skeleton e2e: exercises the full spine (config -> Prisma -> repository
 * -> service -> controller -> exception filter / envelope -> audit) against a
 * real Postgres provided by test/run-e2e.mjs (DATABASE_URL is set there).
 */
describe('Shipments (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

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

  it('creates a shipment -> 201 with a { data } envelope', async () => {
    const res = await request(app.getHttpServer())
      .post('/shipments')
      .send({
        shipmentReference: 'SAF-IMP-2026-0007',
        importer: 'Acme Importers Ltd',
      })
      .expect(201);

    expect(res.body).toHaveProperty('data');
    expect(res.body.data).toMatchObject({
      shipmentReference: 'SAF-IMP-2026-0007',
      importer: 'Acme Importers Ltd',
      currentStatus: 'CREATED',
    });
    expect(res.body.data.id).toEqual(expect.any(String));
  });

  it('records a SHIPMENT_CREATED audit entry on create', async () => {
    const res = await request(app.getHttpServer())
      .post('/shipments')
      .send({ shipmentReference: 'SAF-AUDIT-1' })
      .expect(201);

    const entries = await prisma.auditLog.findMany({
      where: { shipmentId: res.body.data.id },
    });
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      action: 'SHIPMENT_CREATED',
      actor: 'system',
    });
  });

  it('fetches a shipment by id', async () => {
    const created = await request(app.getHttpServer())
      .post('/shipments')
      .send({ shipmentReference: 'SAF-GET-1' })
      .expect(201);
    const id = created.body.data.id;

    const res = await request(app.getHttpServer())
      .get(`/shipments/${id}`)
      .expect(200);
    expect(res.body.data).toMatchObject({ id, shipmentReference: 'SAF-GET-1' });
  });

  it('lists shipments', async () => {
    const res = await request(app.getHttpServer())
      .get('/shipments')
      .expect(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('returns 404 with an { error } envelope for a missing id', async () => {
    const res = await request(app.getHttpServer())
      .get('/shipments/does-not-exist')
      .expect(404);

    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toMatchObject({ statusCode: 404 });
    expect(res.body).not.toHaveProperty('data');
  });

  it('rejects an invalid body with a 400 { error } envelope', async () => {
    const res = await request(app.getHttpServer())
      .post('/shipments')
      .send({ importer: 'no reference supplied' })
      .expect(400);

    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toMatchObject({ statusCode: 400 });
  });
});
