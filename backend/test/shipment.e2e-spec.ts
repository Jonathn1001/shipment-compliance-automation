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
    // Each list row carries an OPEN-issue count for the triage screen.
    expect(res.body.data[0]).toHaveProperty('openIssueCount');
    expect(typeof res.body.data[0].openIssueCount).toBe('number');
  });

  it('returns 404 with an { error } envelope for a missing id', async () => {
    const res = await request(app.getHttpServer())
      .get('/shipments/does-not-exist')
      .expect(404);

    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toMatchObject({
      statusCode: 404,
      code: 'SCA-SHIP-001',
    });
    expect(res.body).not.toHaveProperty('data');
  });

  it('rejects an invalid body with a 422 { error } envelope', async () => {
    const res = await request(app.getHttpServer())
      .post('/shipments')
      .send({ importer: 'no reference supplied' })
      .expect(422);

    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toMatchObject({
      statusCode: 422,
      code: 'SCA-VAL-001',
    });
  });

  it('bounds a list page by ?limit and pages by keyset cursor', async () => {
    // The three created last are the newest, so they lead the newest-first list.
    const ids: string[] = [];
    for (const shipmentReference of ['PAGE-A', 'PAGE-B', 'PAGE-C']) {
      const created = await request(app.getHttpServer())
        .post('/shipments')
        .send({ shipmentReference })
        .expect(201);
      ids.push(created.body.data.id);
    }

    const page1 = await request(app.getHttpServer())
      .get('/shipments?limit=2')
      .expect(200);
    expect(page1.body.data).toHaveLength(2);
    const page1Ids: string[] = page1.body.data.map((r: { id: string }) => r.id);
    page1Ids.forEach((id) => expect(ids).toContain(id));

    const cursor = page1Ids[1];
    const page2 = await request(app.getHttpServer())
      .get(`/shipments?limit=2&cursor=${cursor}`)
      .expect(200);
    const page2Ids: string[] = page2.body.data.map((r: { id: string }) => r.id);
    // Keyset seeks past the cursor row — no overlap with the first page.
    page1Ids.forEach((id) => expect(page2Ids).not.toContain(id));
    // The one created id not on page 1 surfaces once we page past the first two.
    const remaining = ids.find((id) => !page1Ids.includes(id)) as string;
    expect(page2Ids).toContain(remaining);
  });

  it('rejects an out-of-range ?limit with a 422 { error } envelope', async () => {
    const res = await request(app.getHttpServer())
      .get('/shipments?limit=0')
      .expect(422);
    expect(res.body.error).toMatchObject({ statusCode: 422, code: 'SCA-VAL-001' });
  });
});
