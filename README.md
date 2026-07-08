# Shipment Compliance Automation

A backend service (with a React frontend — dashboard, document upload, and a
step-by-step validation pipeline) that automates the compliance review of shipment
documents: ingest document data into a canonical shipment record, run a set of
compliance rules, derive a **readiness** decision and report, and keep a complete
**audit trail** — turning an ad-hoc manual check into a consistent, explainable,
auditable workflow.

Built for the Safiri AI Software Engineer take-home. See
[`CONTEXT.md`](CONTEXT.md) for the domain glossary and
[`docs/adr/`](docs/adr/) for the key design decisions.

---

## What it does

An operator **creates a shipment**, **ingests mock document data** (by uploading
or pasting JSON/CSV/text — no OCR), and triggers **validation**. The system:

- **maps** heterogeneous document fields into a canonical shipment record and
  **reconciles** them — empty fields are filled, conflicting values are preserved
  (never silently overwritten) and surfaced;
- runs a **rule engine** producing classified **validation issues** (type,
  severity, field, explanation, suggested action);
- derives a **readiness status** (`READY` / `NEEDS_REVIEW` / `BLOCKED`) and a
  **readiness report**;
- writes an **append-only audit log** of every meaningful action;
- lets a reviewer **approve** a shipment once it is no longer blocked.

## Architecture

**Backend** — NestJS 11 + Prisma + PostgreSQL, layered
controller → service → repository, with deep, pure, independently-testable
modules:

- **Field Mapper** — `map(rawInput, documentType) → mappedFields` (pure).
- **Reconciler** — `reconcile(current, incoming) → { fills, conflicts }` (pure).
- **Validation rules** — each an isolated `evaluate(ctx) → IssueDraft[]` unit,
  registered via a `VALIDATION_RULES` provider token; the engine iterates them
  (open/closed — a new rule is a new class, no engine change).
- **Status Resolver** and **Readiness Report Builder** — pure.
- **Validation engine** — orchestrates a run inside one `$transaction`: rules →
  reconcile issues → status → update shipment → append report → audit.

Cross-cutting: a typed `AppConfigService` (single config source, no `process.env`
in services), a global `{ data } | { error }` response envelope + exception
filter, a winston logger (no sensitive payloads logged), and an append-only audit
service. Decisions are recorded in [ADR-0001..0003](docs/adr/).

**Frontend** — React 19 + Vite + TypeScript. A **dashboard** (KPI cards, an
issues-by-severity donut and a shipments-over-time trend), a triage **list**, and
a **shipment detail** with five tabs (Overview / Documents / Issues / Readiness
Report / Audit Log). Documents are **uploaded** (drag-and-drop `.json`/`.csv`/
`.txt`, parsed in the browser — no OCR) or pasted, and **Run validation** replays
the engine's real **step-by-step pipeline trace**. Charts are dependency-free
inline SVG; the app talks to the backend through a dev proxy.

## Tech stack

| Layer     | Choice                                             |
| --------- | -------------------------------------------------- |
| Backend   | NestJS 11, Prisma 6, PostgreSQL, pnpm              |
| Frontend  | React 19, Vite 7, TypeScript, npm                  |
| Tests     | Jest (unit + e2e via supertest), embedded-postgres |

---

## Getting started

### Prerequisites

- Node.js 20+, `pnpm` (backend) and `npm` (frontend)
- A PostgreSQL instance for running the app. The **tests** and the one-command
  demo spin up their own throwaway Postgres (`embedded-postgres`), so Docker is
  only needed if you want to run the app against a persistent database.

### 1. Database (local, via Docker — no compose file committed)

```bash
docker run --name shipment-pg -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_USER=postgres -e POSTGRES_DB=shipment_compliance \
  -p 5433:5432 -d postgres:16
```

### 2. Backend

```bash
cd backend
pnpm install
cp .env.example .env                 # adjust DATABASE_URL / PORT if needed
pnpm exec prisma migrate deploy      # apply migrations
pnpm run seed                        # sample shipments to populate the list
pnpm run start:dev                   # dev server on :3000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev                          # dev server on :5173, proxies /api -> :3000
```

Open http://localhost:5173.

### One-command demo (no Docker)

To see the whole thing without provisioning a database, run the demo stack — it
boots a throwaway Postgres, starts the built backend, and seeds four varied
shipments (READY, BLOCKED, NEEDS_REVIEW, CREATED):

```bash
cd backend && pnpm run build && pnpm run dev:stack   # backend + seed on :3000
cd frontend && npm run dev                            # UI on :5173
```

---

## API

Base URL `http://localhost:3000`. Every success is `{ "data": ... }`; every
error is `{ "error": { statusCode, code, message, error, details?, path, timestamp } }`.
Full examples in [`backend/api.http`](backend/api.http), and interactive OpenAPI
docs (request/response schemas, try-it-out) at
[`/api/docs`](http://localhost:3000/api/docs).

| Method | Path                               | Description                          |
| ------ | ---------------------------------- | ------------------------------------ |
| POST   | `/shipments`                       | Create a shipment                    |
| GET    | `/shipments`                       | List shipments (+ `openIssueCount`)  |
| GET    | `/shipments/stats`                 | Dashboard aggregates (status + severity counts, monthly trend) |
| GET    | `/shipments/:id`                   | Get one shipment                     |
| POST   | `/shipments/:id/documents`         | Ingest a document (mapped + reconciled; the UI parses uploads client-side) |
| POST   | `/shipments/:id/validate`          | Run validation (returns issues, report + a step-by-step `trace`) |
| GET    | `/shipments/:id/issues`            | List issues (filter with `?severity=CRITICAL`) |
| GET    | `/shipments/:id/readiness-report`  | Latest readiness report              |
| GET    | `/shipments/:id/audit-log`         | Audit trail                          |
| POST   | `/shipments/:id/approve`           | Approve (409 while BLOCKED)          |

```bash
curl -X POST http://localhost:3000/shipments \
  -H 'content-type: application/json' \
  -d '{"shipmentReference":"SAF-IMP-2026-0007","importer":"Acme Importers Ltd"}'
```

Pass `x-actor: <name>` on state-changing requests to attribute the action in the
audit trail (defaults to `system`).

### Error codes

Every error carries a **stable, catalogued `code`** — the machine-readable
contract a client branches on. The human `message` beside it may change without
breaking callers. Codes are namespaced `SCA-<AREA>-<NNN>` and defined in one
place ([`backend/src/common/error-code.ts`](backend/src/common/error-code.ts)).

| Code | HTTP | Meaning |
| ---- | ---- | ------- |
| `SCA-SHIP-001` | 404 | Shipment not found |
| `SCA-SHIP-002` | 409 | A BLOCKED shipment cannot be approved |
| `SCA-VAL-001`  | 422 | Request validation failed — offending fields under `error.details` |
| `SCA-GEN-001`  | 4xx | Generic client error not raised deliberately (e.g. unmatched route) |
| `SCA-INT-001`  | 500 | Uncategorised server fault (raw cause logged server-side, never returned) |

Input validation returns **422** with per-field detail, so the client reads
structured errors rather than parsing prose:

```json
{ "error": { "statusCode": 422, "code": "SCA-VAL-001",
  "message": "Request validation failed.",
  "details": [{ "field": "shipmentReference",
                "messages": ["shipmentReference should not be empty"] }] } }
```

## Testing

```bash
cd backend
pnpm test        # unit tests (deep modules + rules)
pnpm run test:e2e   # e2e — boots embedded Postgres, applies migrations, runs the suite
pnpm run test:cov   # coverage
```

The deep modules (mapper, reconciler, status resolver, report builder, every
rule, the reference utilities) are unit-tested directly; the engine, ingestion
and API are tested end-to-end through a real transaction / HTTP against an
embedded Postgres. All modules were built test-first.

## Validation rules

Sixteen rules run today (severity in parentheses):
`gross-less-than-net` (critical), `wood-packaging-ispm15` (critical),
`duplicate-shipment-reference` (critical), `missing-required-field` (high),
`hs-code-format` / WCO (high), `country-of-origin-iso` / ISO 3166 (high),
`missing-bill-of-lading` (high), `invoice-value` (high),
`document-shipment-mismatch` (high), `missing-country-of-origin` (medium),
`currency-iso` / ISO 4217 (medium), `weight-discrepancy` (medium),
`container-number-format` / ISO-6346 (medium), `arrival-date-window` (medium),
`certificate-form-e` (medium), `commodity-country-plausibility` / UN Comtrade
(low, advisory — flags an unusual origin for a commodity, never blocks).
Thresholds (`REVIEW_WINDOW_DAYS`, `WEIGHT_TOLERANCE_PCT`) are tunable via config.

---

## Assumptions

- **No real OCR / parsing.** Document input is mock JSON/text; the raw payload is
  stored as-is alongside its canonical mapping.
- **Optional token auth, no per-owner authorization.** Setting `API_AUTH_TOKEN`
  gates every route behind `Authorization: Bearer <token>` (off by default for
  the demo); `actor` is still the passed `x-actor`, not an authenticated
  principal. Per-owner/tenant scoping (IDOR) needs a user model and is out of
  scope. See the Security section.
- **Shipment reference is not unique** by design — duplicates must be able to
  persist so the duplicate-reference rule can flag them.
- **Money and weights** are stored as `Decimal` with pinned precision (never
  `Float`), and carried as strings across the pure modules to avoid precision
  loss and ORM coupling.

## Trade-offs

- **Stateless recompute** (re-run all rules each validation) over incremental
  issue maintenance — simpler and always correct, at the cost of redundant work;
  waivers are preserved via `(issueType, field)` reconciliation (ADR-0002).
- **Rule-provider engine** favours extensibility (add a class, no engine edit)
  over a single monolithic validator.
- **Two-layer model** (canonical shipment vs per-document ingestion) costs extra
  storage and a mapping step but is what makes provenance and mismatch detection
  possible (ADR-0001).
- **Read-mostly frontend** — a dashboard (KPIs, severity donut, shipments-over-time
  trend), a triage list, and a tabbed shipment detail with document upload and a
  live validation-pipeline replay. No PDF export yet, and the "New Shipment"
  create flow is out of scope for the demo (see Future work); route auth is
  optional (Security section).

## Security

Reviewed against the OWASP Top 10 (2021). Controls in place:

- **Injection / mass-assignment (A03):** Prisma parameterizes all SQL; the field
  mapper is a strict allowlist (unknown payload keys — incl. `__proto__` — are
  ignored, so no prototype pollution) and the global `ValidationPipe`
  (`whitelist + forbidNonWhitelisted`) rejects unexpected fields. Untrusted values
  echoed into issue explanations are stripped of control characters and length-capped.
- **DoS surface (A04):** per-IP rate limiting (`@nestjs/throttler`) and an explicit
  64 KB request-body cap (oversized payloads → `413`); the client-side file reader
  refuses files over 1 MB.
- **Access control (A01):** optional shared-token guard (`API_AUTH_TOKEN`,
  constant-time compare) gates every route when set. Per-owner authorization
  (IDOR) needs a user/tenant model and is intentionally out of scope.
- **Misconfiguration (A05):** `helmet` security headers, `X-Powered-By` removed,
  OpenAPI docs served outside production only.
- **SSRF (A10):** none — reference data (ISO/HS/Comtrade) is committed offline
  snapshots, so no user input drives an outbound request.
- **Vulnerable components (A06):** `npm/pnpm audit` clean (a transitive `multer`
  DoS advisory is pinned to `>=2.2.0`).

## AI-usage note

I built this with **Claude Code** (Anthropic) as a pair programmer, and I want to
be straight about how that actually went — where it helped, and where I had to
step in.

The short version: AI let me move quickly on the parts that are mostly typing —
scaffolding the NestJS/Prisma and Vite apps, drafting the pure modules and
validation rules, writing the test suites, and putting these docs together. What
it did *not* do is make the calls. The design was mine and settled up front (the
PRD, and the ADRs in [`docs/adr/`](docs/adr/)), then sliced into vertical,
independently-shippable issues. Everything of substance went in **test-first** — I
watched each test fail for the right reason before any implementation existed, and
no slice moved on until the whole suite, the linter, and the build were green.

I treated the generated code as a draft to be checked, not an answer to trust.
A few moments where that mattered:

- **Waivers were quietly broken.** The first cut of the validation flow still fed
  *waived* issues into the readiness decision, so "accept this risk" didn't
  actually unblock the shipment — it looked done but wasn't. I caught it in review,
  wrote a failing test that waives the only issue and expects `READY`, then fixed
  it so waived issues are kept for the record but no longer drive status.
- **Decimals and dates were compared as strings.** `"12500.5"` vs `"12500.50"`, or
  a date vs its ISO datetime, registered as false conflicts. I pulled that
  comparison into its own tested helper so values that are equal stopped raising
  phantom issues.
- **The tooling fought back, and that's fine.** The embedded Postgres I use for the
  end-to-end tests is ESM-only while Jest runs CommonJS, so I moved the database
  lifecycle into a small ESM runner that boots it and hands off to Jest. Later,
  while verifying the API docs, I noticed the build had started emitting
  `dist/src/main.js` instead of `dist/main.js` and had silently broken the local
  demo script — I traced it to a seed file pulling the compile root up, and fixed
  it.

Where the assistant's first approach was wrong or over-engineered, I redirected it,
and the commit history shows those turns rather than hiding them. And none of this
is a lookup against live customs data: the HS-chapter list, ISPM15 and Form-E
checks are simplified, clearly-labelled stand-ins (see below) — I wouldn't trust
any of it for real clearance without the actual registries wired in. In short, AI
did a lot of the drafting; the judgment, the tests, and the "is this actually
correct?" were mine.

## Mocked data & public data sources

- **WCO Harmonized System chapters** — a committed snapshot
  (`backend/src/validation/reference/wco-hs-chapters.json`) of HS chapter numbers
  and titles is used to sanity-check HS codes. It is **mocked reference data, not
  legal advice**, and not a live lookup. Source of the real nomenclature: the
  World Customs Organization (https://www.wcoomd.org/) and public HS/HTS
  references.
- **ISO 3166-1 countries** and **ISO 4217 currencies** — committed snapshots
  (`iso-3166.json`, `iso-4217.json`) generated once from node's built-in `Intl`
  (canonical alpha-2 list + `Intl.supportedValuesOf('currency')`, English names
  via `Intl.DisplayNames`) by `backend/scripts/gen-iso.mjs`; re-run to refresh.
  Used to validate country-of-origin and invoice-currency fields offline.
- **UN Comtrade trade-flow context** — a bounded, mocked snapshot
  (`comtrade-plausibility.json`) mapping a handful of HS chapters to their
  well-known major exporting origins. Powers the **advisory** (LOW, never
  blocking) commodity↔country plausibility check. Illustrative, not exhaustive;
  refresh from Comtrade export rankings. Source: https://comtradeplus.un.org/.
- **ISO-6346** container check-digit validation is implemented from the public
  standard's algorithm.
- **ISPM15** and **Form-E / certificate-of-origin** logic uses simplified,
  illustrative criteria for the exercise — not production customs rules.

No live external lookups are performed. Nothing here should be relied on for
actual customs clearance.

## Future work

A shipment-create flow ("New Shipment") and PDF export of the readiness report;
role-based access control and per-tenant authorization (real authenticated
actors, closing the IDOR gap); CSV bulk import; container check-digit vs. live
registry verification; live integration with WCO / UN Comtrade / HTS / ISO
registries in place of the mocked snapshots; and AI-assisted HS-code suggestion
(designed here, not implemented).

## Documentation

- [`CONTEXT.md`](CONTEXT.md) — domain glossary.
- [`docs/adr/`](docs/adr/) — architecture decision records (0001–0003).
- [`docs/design/`](docs/design/) — process flow (BPMN-style), entity map, UI mock.
- [`backend/api.http`](backend/api.http) — runnable API examples.
