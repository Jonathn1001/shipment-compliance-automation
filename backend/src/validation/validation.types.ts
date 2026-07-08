import { Severity, Shipment } from '../../generated/prisma/client';
import { CanonicalFields } from '../document/canonical';

/**
 * A rule's finding before persistence. `issueType` is a stable String rule-code
 * (e.g. `gross-less-than-net`) — not an enum — so adding a rule never touches the
 * schema. `(issueType, field)` is the stable key used to reconcile issues across
 * validation runs (preserve WAIVED, resolve absent ones).
 */
export interface IssueDraft {
  issueType: string;
  severity: Severity;
  field: string | null;
  explanation: string;
  suggestedAction: string;
}

/**
 * Everything a rule needs to evaluate a shipment. Tunable thresholds
 * (review window, weight tolerance) are injected here so rules read config
 * through the context, never `process.env` — and stay pure and unit-testable.
 */
export interface ValidationContext {
  shipment: Shipment;
  /** Count of OTHER persisted shipments sharing this reference (duplicate rule). */
  otherShipmentsWithSameReference: number;
  /**
   * The union of canonical fields seen across this shipment's ingested documents.
   * Used by the document-vs-shipment mismatch rule to compare what a document
   * asserted against the canonical record (a document value that differs from a
   * set canonical value is a mismatch, not a fill — see the reconciler).
   */
  documentValues: CanonicalFields;
  thresholds: {
    reviewWindowDays: number;
    weightTolerancePct: number;
  };
  now: Date;
}

/**
 * Uniform rule interface. Each rule is an isolated, pure unit: given a context it
 * returns zero or more issue drafts. Rules are registered via the
 * `VALIDATION_RULES` multi-provider token; the engine iterates and flattens, so a
 * new rule is a new class with no engine change (open/closed).
 */
export interface ValidationRule {
  evaluate(ctx: ValidationContext): IssueDraft[];
}

/** DI token for the multi-provider array of validation rules. */
export const VALIDATION_RULES = Symbol('VALIDATION_RULES');

/**
 * One observable phase of a validation run, surfaced in the `/validate` response
 * so the UI can show the pipeline step by step. `detail` carries the real numbers
 * the engine computed for that phase (not a reconstruction).
 */
export interface ValidationStep {
  key: 'context' | 'rules' | 'reconcile' | 'status' | 'report';
  label: string;
  detail: Record<string, string | number | boolean>;
}
