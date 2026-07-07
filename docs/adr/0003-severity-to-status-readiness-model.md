# ADR-0003 — Severity → status readiness model

Status: Accepted · 2026-07-07

## Context

After validation, an operator needs a single, unambiguous answer: can this
shipment proceed, must a human sign off, or is it blocked? That decision must be
deterministic, explainable, and derived only from the issues found — not set by
hand — so it is consistent between operators and reproducible on re-validation.

## Decision

A pure **Status Resolver** maps the set of active issue severities to a readiness
status:

| Highest severity present | Status         | Human review |
| ------------------------ | -------------- | ------------ |
| any `CRITICAL`           | `BLOCKED`      | required     |
| any `HIGH` or `MEDIUM`   | `NEEDS_REVIEW` | required     |
| only `LOW`, or none      | `READY`        | not required |

A pure **Readiness Report Builder** then summarizes the issues into a
decision-ready artifact: total/critical/warning counts, the snapshotted status
and overall assessment, whether human review is required, and a de-duplicated
list of suggested next actions. Each validation run **appends** a new report, so
a shipment's readiness history is retained.

Approval is guarded by the same model: a `BLOCKED` shipment cannot be approved
(409); resolving or waiving the blocking issues and re-validating is the only way
forward.

## Consequences

- The status is a deterministic function of the issues — no hidden state, trivial
  to unit-test across every branch.
- `humanReviewRequired` is simply "not READY", giving reviewers a clear queue.
- Readiness reports form an append-only timeline of how a shipment's compliance
  posture evolved.
- Cost: the severity ladder is coarse (four levels). Sufficient here; a richer
  policy (e.g. score-based) could replace the resolver without touching the rules
  or the engine, since it is a single pure function.
