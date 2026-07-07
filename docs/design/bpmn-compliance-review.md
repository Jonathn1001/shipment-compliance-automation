# Design — Compliance review process (BPMN-style flow)

The operational flow the system automates, from shipment creation to approval.
Rendered as a Mermaid flowchart (a lightweight stand-in for BPMN).

```mermaid
flowchart TD
    A([Operator creates shipment]) --> B[Shipment record\nstatus: CREATED]
    B --> C{Ingest documents?}
    C -- yes --> D[Map document -> canonical fields]
    D --> E[Reconcile:\nfill empty, preserve conflicts]
    E --> F[(DocumentIngestion stored\nraw + mapped)]
    F --> C
    C -- no / done --> G[Trigger validation]

    G --> H[Run all rules\nin one transaction]
    H --> I[Reconcile issues\nWAIVED preserved, absent -> RESOLVED]
    I --> J{Highest severity?}
    J -- critical --> K[Status: BLOCKED]
    J -- high / medium --> L[Status: NEEDS_REVIEW]
    J -- low / none --> M[Status: READY]

    K --> N[Append readiness report\n+ audit]
    L --> N
    M --> N

    N --> O{Reviewer decision}
    O -- blocked --> P[Resolve or waive issues] --> G
    O -- approve non-blocked --> Q([Status: APPROVED])
    O -- approve while BLOCKED --> R[Rejected: 409\nno change]
```

## Notes

- Every transition that changes state appends an **AuditLog** entry
  (`SHIPMENT_CREATED`, `DOCUMENT_INGESTED`, `FIELD_UPDATED`, `VALIDATION_RUN`,
  `STATUS_CHANGED`, `REPORT_GENERATED`, `SHIPMENT_APPROVED`).
- Validation is a single atomic recompute (ADR-0002); re-running it after a fix
  loops back through the same path.
- Approval is guarded by the readiness model (ADR-0003): a BLOCKED shipment
  cannot advance.
