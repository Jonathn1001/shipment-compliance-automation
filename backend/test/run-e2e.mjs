// E2E runner. embedded-postgres is ESM-only, so the database lifecycle lives
// here (an ESM script) rather than inside the CJS Jest process. This boots a
// throwaway Postgres, applies the Prisma migrations, then runs the Jest e2e
// suite against it via DATABASE_URL, and always tears the cluster down.
import EmbeddedPostgres from 'embedded-postgres';
import { spawn } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const backendRoot = join(here, '..');
const port = 6000 + Math.floor(Math.random() * 2000);
const database = 'shipment_compliance_e2e';
const dataDir = join(backendRoot, '.pg-data', `e2e-${port}`);

const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  port,
  user: 'postgres',
  password: 'postgres',
  persistent: false,
  onLog: () => {},
  onError: (m) => console.error('[pg]', m?.toString?.() ?? m),
});

function applyMigrations(client) {
  const migrationsDir = join(backendRoot, 'prisma', 'migrations');
  const dirs = readdirSync(migrationsDir)
    .filter((d) => /^\d+_/.test(d))
    .sort();
  return dirs.reduce(
    (chain, d) =>
      chain.then(() =>
        client.query(readFileSync(join(migrationsDir, d, 'migration.sql'), 'utf8')),
      ),
    Promise.resolve(),
  );
}

function runJest(databaseUrl) {
  return new Promise((resolve) => {
    const jestBin = join(backendRoot, 'node_modules', '.bin', 'jest');
    const child = spawn(
      jestBin,
      ['--config', join(here, 'jest-e2e.json'), '--runInBand', ...process.argv.slice(2)],
      {
        cwd: backendRoot,
        stdio: 'inherit',
        env: { ...process.env, DATABASE_URL: databaseUrl },
      },
    );
    child.on('close', (code) => resolve(code ?? 1));
  });
}

let exitCode = 1;
try {
  await pg.initialise();
  await pg.start();
  await pg.createDatabase(database);

  const client = pg.getPgClient(database);
  await client.connect();
  await applyMigrations(client);
  await client.end();

  const databaseUrl = `postgresql://postgres:postgres@localhost:${port}/${database}?schema=public`;
  exitCode = await runJest(databaseUrl);
} catch (err) {
  console.error('[run-e2e] failed:', err);
  exitCode = 1;
} finally {
  try {
    await pg.stop();
  } catch (err) {
    console.error('[run-e2e] teardown failed:', err);
  }
}

process.exit(exitCode);
