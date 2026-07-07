# Shipment Compliance Automation — Backend

NestJS 11 + Prisma + PostgreSQL service that automates compliance review of
shipment documents: ingest document data into a canonical shipment record, run a
compliance rule engine, derive a readiness status + report, and keep an
append-only audit trail. See `.scratch/shipment-compliance-automation/PRD.md` for
the full product spec.

> **Status:** in progress. This slice (Issue 01) delivers the walking skeleton —
> the full cross-cutting spine plus shipment create/read. Document ingestion,
> the validation engine, approval, and the frontend land in later slices.

## Stack

- **NestJS 11** (pnpm) — layered: controller → service → repository.
- **Prisma + PostgreSQL** — Postgres is the source of truth (native enums, jsonb,
  `Decimal` money/weights).
- **Config** — typed `AppConfigService` over `@nestjs/config`; env validated at
  bootstrap. No service reads `process.env` directly.
- **Cross-cutting** — global `{ data } | { error }` response envelope, global
  exception filter, winston logger, append-only audit log.

## Prerequisites

- Node.js 20+ and `pnpm`
- A PostgreSQL instance for running the app (the e2e tests spin up their own
  throwaway Postgres — see [Testing](#testing) — so Docker is only needed to run
  the app locally).

## Database (local, via Docker)

No compose file is committed — start Postgres with a one-liner (port `5433` to
match `.env.example`):

```bash
docker run --name shipment-pg -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_USER=postgres -e POSTGRES_DB=shipment_compliance \
  -p 5433:5432 -d postgres:16
```

## Setup

```bash
pnpm install                     # install dependencies
cp .env.example .env             # then adjust DATABASE_URL / PORT if needed
pnpm exec prisma migrate deploy  # apply migrations to the database
pnpm run start:dev               # watch-mode dev server (default port 3000)
```

`pnpm exec prisma generate` regenerates the client into `generated/prisma/` after
a schema change (`prisma migrate dev --name <name>` creates a new migration).

## Configuration

All configuration flows through `AppConfigService` (validated at startup):

| Variable | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | — (required) | Postgres connection string |
| `PORT` | `3000` | HTTP port |
| `REVIEW_WINDOW_DAYS` | `30` | Arrival-date review window (validation rules, later slice) |
| `WEIGHT_TOLERANCE_PCT` | `5` | Gross/net weight tolerance (validation rules, later slice) |

## API (current slice)

Every success is wrapped as `{ "data": ... }`; every error as
`{ "error": { statusCode, message, error, path, timestamp } }`.

| Method | Path | Description |
|---|---|---|
| `POST` | `/shipments` | Create a shipment (only `shipmentReference` required) |
| `GET` | `/shipments` | List shipments |
| `GET` | `/shipments/:id` | Fetch one shipment (404 if missing) |

```bash
curl -X POST http://localhost:3000/shipments \
  -H 'content-type: application/json' \
  -d '{"shipmentReference":"SAF-IMP-2026-0007","importer":"Acme Importers Ltd"}'
```

Pass an `x-actor` header on state-changing requests to record a human actor in the
audit trail (defaults to `system`).

## Testing

```bash
pnpm test        # unit tests
pnpm run test:e2e   # e2e — boots a throwaway embedded Postgres, applies
                    # migrations, runs the suite against it, tears it down
pnpm run test:cov   # coverage
```

The e2e runner (`test/run-e2e.mjs`) uses `embedded-postgres`, so end-to-end tests
need no external database or Docker.
