# ADR-0001 — Documents are first-class; reconciliation never overwrites

Status: Accepted · 2026-07-07

## Context

Shipment data arrives from two kinds of source: values an operator enters
directly on the shipment record, and values extracted from ingested documents
(commercial invoice, packing list, bill of lading, certificate of origin). A
naive design would let each ingested document write straight onto a single
shipment row. That loses two things the business needs:

- **Provenance** — what did a given document actually contain, and when.
- **Disagreement** — when a document contradicts the canonical record, that
  contradiction is itself a compliance signal (the document-vs-shipment mismatch
  rule) and must survive, not be silently resolved by a last-writer-wins update.

## Decision

Model two layers:

- **`Shipment`** — the canonical record, the single source of truth.
- **`DocumentIngestion`** — one row per ingested document, storing both the raw
  payload (`rawInput`, exactly as received) and its canonical projection
  (`mappedFields`).

Ingestion runs a pure **Field Mapper** (`map(rawInput, documentType) →
mappedFields`) then a pure **Reconciler** (`reconcile(current, incoming) →
{ fills, conflicts }`). Reconciliation obeys one rule: **an empty canonical field
is filled from the document; a set-and-differing canonical field is left intact
and the difference is surfaced as a conflict.** The canonical record is never
overwritten by a document.

## Consequences

- The canonical record stays authoritative and auditable; every fill is recorded
  as a `FIELD_UPDATED` audit entry (old → new).
- Document/record disagreements persist and are flagged at validation time by the
  `document-shipment-mismatch` rule rather than being lost.
- Both mapper and reconciler are pure functions, unit-tested in isolation without
  a database.
- Cost: two-layer storage and a mapping step per ingest. Accepted — it is the
  load-bearing decision that makes provenance and mismatch detection possible.
