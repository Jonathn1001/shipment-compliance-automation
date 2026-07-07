# Design — UI mock (read-only console)

Two screens ship: a triage **list** and a **detail** view with five tabs. The
delivered frontend implements exactly this (see `frontend/`). ASCII mocks below.

## Shipment list — triage queue

```
┌ ◇ SCA  Shipment Compliance Console ─────────────────── read-only · demo ┐
│                                                                          │
│  TRIAGE QUEUE                                                            │
│  ┌──────────────────┬───────────────────┬────────────┬────────┬───────┐ │
│  │ Reference        │ Importer          │ Status     │ Issues │ Updated│ │
│  ├──────────────────┼───────────────────┼────────────┼────────┼───────┤ │
│  │ SAF-IMP-2026-0007│ Acme Importers Ltd│ ● Approved │   0    │  …    │ │
│  │ SAF-IMP-2026-0012│ Nordic Retail AB  │ ● Blocked  │   3    │  …    │ │
│  │ SAF-IMP-2026-0021│ Acme Importers Ltd│ ● Needs rev│   1    │  …    │ │
│  │ SAF-IMP-2026-0033│ Meridian Freight  │ ● Created  │   0    │  …    │ │
│  └──────────────────┴───────────────────┴────────────┴────────┴───────┘ │
└──────────────────────────────────────────────────────────────────────────┘
   Status "lamp" color = readiness severity. Row → detail.
```

## Shipment detail — header + five tabs

```
┌ ← Back to queue ─────────────────────────────────────────────────────────┐
│▌ SAF-IMP-2026-0012                       ● Blocked      [ Run validation ]│
│▌ Nordic Retail AB                                                         │
│  (left rail color = status)                                              │
├──────────────────────────────────────────────────────────────────────────┤
│  Overview │ Documents 0 │ Issues 3 │ Readiness Report │ Audit Log 6       │
├──────────────────────────────────────────────────────────────────────────┤
│  [Issues]                                                                 │
│  ┌────────────────────────────────────────────────────────────── OPEN ─┐ │
│  │ CRITICAL  gross-less-than-net · grossWeightKg                        │ │
│  │ Gross weight (900 kg) is less than net weight (1000 kg)…             │ │
│  │ Fix: Correct the gross/net weights; gross must be ≥ net.             │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────── OPEN ─┐ │
│  │ CRITICAL  wood-packaging-ispm15 · ispm15Certified                   │ │
│  │ Wood packaging is not ISPM15-certified; customs would reject it.    │ │
│  │ Fix: Obtain ISPM15 certification for the wood packaging.            │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘
```

## Tabs

- **Overview** — canonical fields as a labelled definition grid (mono values;
  "not set" for empty).
- **Documents** — each ingested document: type, source, mapped fields (JSON).
- **Issues** — one card per issue: severity chip, rule-code, field, explanation,
  suggested fix, status.
- **Readiness Report** — summary tiles (assessment, total/critical/warning
  counts, human-review flag) + de-duplicated next actions.
- **Audit Log** — timestamped action / actor / details table.

The **Run validation** button posts `/shipments/:id/validate` and refreshes.
Out of scope for the delivered UI (retained as "planned product"): dashboard
charts, PDF export, document upload, approvals dashboard, auth.
