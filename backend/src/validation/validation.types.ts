import { Severity, Shipment } from '../../generated/prisma/client';

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
  otherShipmentsWithSameReference: number;
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
