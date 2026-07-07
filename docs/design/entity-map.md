# Design — Entity map

The persistence model (Postgres via Prisma). `Shipment` is the canonical record;
every other entity hangs off it and cascades on delete.

```mermaid
erDiagram
    Shipment ||--o{ DocumentIngestion : "has"
    Shipment ||--o{ ValidationIssue : "has"
    Shipment ||--o{ ReadinessReport : "has (history)"
    Shipment ||--o{ AuditLog : "has (append-only)"

    Shipment {
        string id PK
        string shipmentReference "indexed, NOT unique"
        string exporter
        string importer
        decimal invoiceValue "Decimal(18,2)"
        string hsCode
        string countryOfOrigin
        decimal grossWeightKg "Decimal(12,3)"
        decimal netWeightKg "Decimal(12,3)"
        string containerNumber
        string billOfLadingNumber
        string packagingType
        boolean ispm15Certified
        string eformCertificate
        datetime arrivalDate
        enum currentStatus "CREATED|READY|NEEDS_REVIEW|BLOCKED|APPROVED"
    }
    DocumentIngestion {
        string id PK
        string shipmentId FK
        enum documentType
        enum sourceType
        json rawInput "as received"
        json mappedFields "canonical projection"
    }
    ValidationIssue {
        string id PK
        string shipmentId FK
        string issueType "rule-code, NOT enum"
        enum severity "LOW|MEDIUM|HIGH|CRITICAL"
        string field
        string explanation
        string suggestedAction
        enum status "OPEN|WAIVED|RESOLVED"
    }
    ReadinessReport {
        string id PK
        string shipmentId FK
        enum statusSnapshot
        enum overallAssessment
        boolean humanReviewRequired
        int totalIssues
        int criticalCount
        int warningCount
        string_array nextActions
        datetime generatedAt
    }
    AuditLog {
        string id PK
        string shipmentId FK
        datetime timestamp
        enum action
        string actor "defaults to system"
        json details "old -> new"
    }
```

## Indexing notes

Postgres does not auto-index foreign keys, so read paths are indexed explicitly:
`ValidationIssue(shipmentId, status)` and `(shipmentId, issueType, field)` (the
reconcile key), `ReadinessReport(shipmentId, generatedAt)`,
`AuditLog(shipmentId, timestamp)`, `DocumentIngestion(shipmentId)`, and
`Shipment(shipmentReference)` (not unique — duplicates must persist so the
duplicate-reference rule can flag them).
