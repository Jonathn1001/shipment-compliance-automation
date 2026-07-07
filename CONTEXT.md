# CONTEXT — Shipment Compliance Automation

Domain glossary for the shipment compliance mini-system. Terms are the shared
vocabulary used across code, tests, and docs; use them exactly.

## Core entities

- **Shipment** — the *canonical record* for one consignment and the single source
  of truth. Created with partial data and progressively completed. Carries a
  `shipmentReference` (indexed, **not** unique) and a `currentStatus`.
- **DocumentIngestion** — one ingested document attached to a shipment. Stores the
  **raw input** (exactly as received) and the **mapped fields** (canonical
  projection). No real OCR — payloads are mock JSON/text.
- **ValidationIssue** — a classified problem found by a rule: `issueType`
  (rule-code), `severity`, `field`, `explanation`, `suggestedAction`, `status`.
- **ReadinessReport** — an append-only snapshot summarizing a validation run.
- **AuditLog** — append-only trail; one entry per state-changing action.

## Data flow terms

- **Canonical field** — a field on the `Shipment` (the source of truth). Contrast
  with **mapped field** — a document value projected into the canonical shape by
  the field mapper.
- **Field Mapper** — pure `map(rawInput, documentType) → mappedFields`. Normalizes
  heterogeneous document keys to canonical names.
- **Reconciliation** — pure `reconcile(current, incoming) → { fills, conflicts }`.
  An empty canonical field is **filled**; a set-and-differing field is a
  **conflict** and is left intact (never overwritten). See ADR-0001.
- **Fill** vs **Conflict** — a fill completes missing data (audited
  `FIELD_UPDATED`); a conflict is a disagreement surfaced for the
  document-vs-shipment mismatch rule.

## Validation terms

- **Rule** — an isolated `evaluate(ctx) → IssueDraft[]` unit, registered via the
  `VALIDATION_RULES` provider token. Adding one does not change the engine
  (open/closed). See ADR-0002.
- **Validation context** — everything a rule needs: the shipment, tunable
  thresholds (review window, weight tolerance), the duplicate-reference count,
  and the merged document values.
- **Severity** — `LOW | MEDIUM | HIGH | CRITICAL`.
- **Issue lifecycle** — `OPEN` (currently raised) → `WAIVED` (accepted risk,
  preserved across re-validation) or `RESOLVED` (no longer raised, kept for
  history). Reconciled by the stable key `(issueType, field)`.

## Readiness terms

- **Severity → status** — any `CRITICAL` → **BLOCKED**; else any `HIGH`/`MEDIUM` →
  **NEEDS_REVIEW**; else **READY**. See ADR-0003.
- **Readiness** — whether a shipment can proceed. `humanReviewRequired` is true
  whenever the status is not READY.
- **Status** — `CREATED → READY | NEEDS_REVIEW | BLOCKED → APPROVED`. Approval is
  guarded: a BLOCKED shipment cannot be approved.
- **Actor** — the party attributed to an action in the audit trail; a passed value
  (`x-actor` header), defaulting to `"system"`. Not an authenticated principal —
  auth is out of scope.

## Related decisions

- [ADR-0001](docs/adr/0001-document-first-class-and-no-overwrite-reconcile.md) —
  documents first-class, no-overwrite reconcile.
- [ADR-0002](docs/adr/0002-stateless-recompute-and-rule-provider-engine.md) —
  stateless recompute + rule-provider engine.
- [ADR-0003](docs/adr/0003-severity-to-status-readiness-model.md) —
  severity → status readiness model.
