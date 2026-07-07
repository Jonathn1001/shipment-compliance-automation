# ADR-0002 — Stateless recompute + rule-provider validation engine

Status: Accepted · 2026-07-07

## Context

Compliance validation is a growing set of independent checks (weights, HS code,
ISPM15, container format, duplicate reference, document mismatch, …). Two forces
shape the design:

- The rule set will keep growing; adding a rule must not require editing the
  engine or a migration.
- Re-running validation after a fix must produce a result that reflects the
  current state — stale issues must disappear, new ones appear — while an
  operator's explicit **waiver** of an accepted risk must not be re-raised on
  every run.

## Decision

**Rule-provider engine (open/closed).** Each rule is an isolated class
implementing `evaluate(ctx) → IssueDraft[]`, registered via a `VALIDATION_RULES`
multi-provider token. The engine iterates the injected array and flattens the
results. Adding a rule is adding a class to the provider list — the engine code
does not change. `issueType` is a **String rule-code, not an enum**, so a new
rule needs no schema change.

**Stateless recompute with reconciliation.** `ValidationService.run(shipmentId)`
recomputes every rule from the current shipment state inside one `$transaction`,
then reconciles the fresh drafts against the stored issues by the stable key
`(issueType, field)`:

- a prior `WAIVED` issue is preserved as-is (accepted risk, never re-raised),
- a prior issue still produced is refreshed `OPEN`,
- a prior issue no longer produced becomes `RESOLVED` (kept for history),
- a new draft is inserted `OPEN`.

The readiness status and report are then derived from the resulting active issues
and persisted, and the whole run is audited (`VALIDATION_RUN`, `STATUS_CHANGED`,
`REPORT_GENERATED`).

## Consequences

- New rules are cheap and isolated; each is a pure unit tested with a passing and
  a violating case.
- The issue list is never stale, yet waivers are durable across runs.
- Thresholds (`REVIEW_WINDOW_DAYS`, `WEIGHT_TOLERANCE_PCT`) are injected into the
  rule context from typed config, so rules stay pure and tunable.
- Cost: every run re-evaluates all rules and rewrites the issue set. Acceptable at
  this scale and far simpler to reason about than incremental issue maintenance.
