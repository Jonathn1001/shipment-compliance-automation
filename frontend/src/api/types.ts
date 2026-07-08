// Mirror of the backend's API shapes (the fields the read-only UI consumes).

export type ShipmentStatus = 'CREATED' | 'READY' | 'NEEDS_REVIEW' | 'BLOCKED' | 'APPROVED';
export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type IssueStatus = 'OPEN' | 'WAIVED' | 'RESOLVED';
export type ReadinessAssessment = 'READY_TO_PROCEED' | 'NEEDS_HUMAN_REVIEW' | 'BLOCKED';

export type DocumentType =
  | 'COMMERCIAL_INVOICE'
  | 'PACKING_LIST'
  | 'BILL_OF_LADING'
  | 'CERTIFICATE_FORM_E'
  | 'OTHER';
export type SourceType = 'JSON' | 'OCR' | 'API' | 'CSV';

/** Body for `POST /shipments/:id/documents`. `payload` is freeform mock data. */
export interface IngestDocumentInput {
  documentType: DocumentType;
  sourceType: SourceType;
  payload: Record<string, unknown>;
}

export interface Shipment {
  id: string;
  shipmentReference: string;
  exporter: string | null;
  importer: string | null;
  importerId: string | null;
  invoiceNumber: string | null;
  invoiceValue: string | null;
  currency: string | null;
  goodsDescription: string | null;
  hsCode: string | null;
  countryOfOrigin: string | null;
  grossWeightKg: string | null;
  netWeightKg: string | null;
  numberOfPackages: number | null;
  containerNumber: string | null;
  billOfLadingNumber: string | null;
  packagingType: string | null;
  ispm15Certified: boolean | null;
  eformCertificate: string | null;
  freightMode: string | null;
  arrivalDate: string | null;
  currentStatus: ShipmentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ShipmentListRow extends Shipment {
  openIssueCount: number;
}

/** One month bucket of the dashboard shipments-over-time trend. */
export interface MonthlyPoint {
  month: string;
  label: string;
  count: number;
}

/** Aggregate for the dashboard (`GET /shipments/stats`). Every enum key present. */
export interface ShipmentStats {
  total: number;
  byStatus: Record<ShipmentStatus, number>;
  openIssuesBySeverity: Record<Severity, number>;
  shipmentsOverTime: MonthlyPoint[];
}

export interface DocumentIngestion {
  id: string;
  shipmentId: string;
  documentType: string;
  sourceType: string;
  rawInput: Record<string, unknown>;
  mappedFields: Record<string, unknown>;
  createdAt: string;
}

export interface ValidationIssue {
  id: string;
  shipmentId: string;
  issueType: string;
  severity: Severity;
  field: string | null;
  explanation: string;
  suggestedAction: string;
  status: IssueStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ReadinessReport {
  id: string;
  shipmentId: string;
  statusSnapshot: ShipmentStatus;
  overallAssessment: ReadinessAssessment;
  humanReviewRequired: boolean;
  totalIssues: number;
  criticalCount: number;
  warningCount: number;
  nextActions: string[];
  generatedAt: string;
}

export interface AuditLog {
  id: string;
  shipmentId: string;
  timestamp: string;
  action: string;
  actor: string;
  details: Record<string, unknown> | null;
}

/** One phase of a validation run, as reported by the engine (`/validate`). */
export interface ValidationStep {
  key: 'context' | 'rules' | 'reconcile' | 'status' | 'report';
  label: string;
  detail: Record<string, string | number | boolean>;
}

export interface ValidationRunResult {
  status: ShipmentStatus;
  issues: ValidationIssue[];
  report: ReadinessReport;
  trace: ValidationStep[];
}
