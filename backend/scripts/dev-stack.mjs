// Local demo stack: boots a throwaway embedded Postgres, applies migrations,
// starts the built NestJS app in-process, and seeds a few varied shipments so the
// frontend has live data to render. Stays alive until interrupted.
import EmbeddedPostgres from 'embedded-postgres';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const backendRoot = join(here, '..');
const port = 5599;
const database = 'shipment_compliance_dev';
const dataDir = join(backendRoot, '.pg-data', 'dev-stack');

const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  port,
  user: 'postgres',
  password: 'postgres',
  persistent: false,
  onLog: () => {},
  onError: (m) => console.error('[pg]', m?.toString?.() ?? m),
});

async function applyMigrations(client) {
  const migrationsDir = join(backendRoot, 'prisma', 'migrations');
  const dirs = readdirSync(migrationsDir).filter((d) => /^\d+_/.test(d)).sort();
  for (const d of dirs) {
    await client.query(readFileSync(join(migrationsDir, d, 'migration.sql'), 'utf8'));
  }
}

const api = 'http://localhost:3000';
const post = (path, body) =>
  fetch(`${api}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  }).then((r) => r.json());

async function waitForBackend() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`${api}/shipments`);
      if (r.ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((res) => setTimeout(res, 500));
  }
  throw new Error('backend did not come up');
}

async function seed() {
  // 1) Clean shipment -> validate -> READY.
  const clean = await post('/shipments', {
    shipmentReference: 'SAF-IMP-2026-0007',
    exporter: 'Shenzhen Widgets Co',
    importer: 'Acme Importers Ltd',
    hsCode: '8471.30',
    goodsDescription: 'Laptop computers',
    countryOfOrigin: 'DE',
    billOfLadingNumber: 'BL-88231',
    invoiceValue: 12500.5,
    currency: 'USD',
    containerNumber: 'CSQU3054383',
    grossWeightKg: 1040,
    netWeightKg: 1000,
    packagingType: 'Plastic',
  });
  await post(`/shipments/${clean.data.id}/validate`);
  await post(`/shipments/${clean.data.id}/approve`);

  // 2) Wood packaging, no ISPM15 -> BLOCKED.
  const blocked = await post('/shipments', {
    shipmentReference: 'SAF-IMP-2026-0012',
    exporter: 'Guangzhou Timber Ltd',
    importer: 'Nordic Retail AB',
    hsCode: '9403.60',
    goodsDescription: 'Wooden furniture',
    countryOfOrigin: 'CN',
    billOfLadingNumber: 'BL-90011',
    invoiceValue: 8200,
    currency: 'USD',
    grossWeightKg: 900,
    netWeightKg: 1000,
    packagingType: 'Wooden crate',
    ispm15Certified: false,
  });
  await post(`/shipments/${blocked.data.id}/validate`);

  // 3) Partial shipment + a conflicting document -> NEEDS_REVIEW after validate.
  const partial = await post('/shipments', {
    shipmentReference: 'SAF-IMP-2026-0021',
    exporter: 'Osaka Components KK',
    importer: 'Acme Importers Ltd',
    hsCode: '8542.31',
    goodsDescription: 'Integrated circuits',
    countryOfOrigin: 'JP',
    billOfLadingNumber: 'BL-77320',
    invoiceValue: 45000,
    currency: 'USD',
    containerNumber: 'MSKU1234565',
    grossWeightKg: 520,
    netWeightKg: 500,
    packagingType: 'Carton',
  });
  await post(`/shipments/${partial.data.id}/documents`, {
    documentType: 'COMMERCIAL_INVOICE',
    sourceType: 'JSON',
    payload: { buyer: 'Globex Trading', total_value: 45000 },
  });
  await post(`/shipments/${partial.data.id}/validate`);

  // 4) A brand-new shipment left in CREATED (not yet validated).
  await post('/shipments', {
    shipmentReference: 'SAF-IMP-2026-0033',
    importer: 'Meridian Freight Co',
    goodsDescription: 'Assorted apparel',
  });

  console.log('[dev-stack] seeded 4 shipments');
}

let shuttingDown = false;
async function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  try {
    await pg.stop();
  } catch (e) {
    console.error('[dev-stack] pg stop failed', e);
  }
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

try {
  await pg.initialise();
  await pg.start();
  await pg.createDatabase(database);
  const client = pg.getPgClient(database);
  await client.connect();
  await applyMigrations(client);
  await client.end();

  process.env.DATABASE_URL = `postgresql://postgres:postgres@localhost:${port}/${database}?schema=public`;
  process.env.PORT = '3000';

  // Start the built NestJS app in-process (bootstrap runs on import).
  await import(join(backendRoot, 'dist', 'main.js'));
  await waitForBackend();
  await seed();
  console.log('[dev-stack] backend live on http://localhost:3000');
} catch (err) {
  console.error('[dev-stack] failed:', err);
  await shutdown();
}
