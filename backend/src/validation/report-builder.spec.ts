import { Severity } from '../../generated/prisma/client';
import { buildReadinessReport } from './report-builder';

const issue = (
  severity: Severity,
  over: Partial<{ field: string; suggestedAction: string }> = {},
) => ({
  severity,
  field: over.field ?? 'someField',
  suggestedAction: over.suggestedAction ?? 'do something',
});

describe('buildReadinessReport', () => {
  it('reports READY_TO_PROCEED with zero counts for a clean shipment', () => {
    const report = buildReadinessReport(
      'SHIP-1',
      { status: 'READY', humanReviewRequired: false },
      [],
    );

    expect(report).toMatchObject({
      shipmentId: 'SHIP-1',
      statusSnapshot: 'READY',
      overallAssessment: 'READY_TO_PROCEED',
      humanReviewRequired: false,
      totalIssues: 0,
      criticalCount: 0,
      warningCount: 0,
    });
    expect(report.nextActions).toEqual([]);
  });

  it('counts criticals and warnings and maps BLOCKED -> BLOCKED assessment', () => {
    const issues = [
      issue(Severity.CRITICAL, { suggestedAction: 'fix weights' }),
      issue(Severity.HIGH),
      issue(Severity.MEDIUM),
      issue(Severity.LOW),
    ];

    const report = buildReadinessReport(
      'SHIP-2',
      { status: 'BLOCKED', humanReviewRequired: true },
      issues,
    );

    expect(report.totalIssues).toBe(4);
    expect(report.criticalCount).toBe(1);
    expect(report.warningCount).toBe(2); // HIGH + MEDIUM, excludes LOW and CRITICAL
    expect(report.overallAssessment).toBe('BLOCKED');
    expect(report.humanReviewRequired).toBe(true);
  });

  it('maps NEEDS_REVIEW -> NEEDS_HUMAN_REVIEW assessment', () => {
    const report = buildReadinessReport(
      'SHIP-3',
      { status: 'NEEDS_REVIEW', humanReviewRequired: true },
      [issue(Severity.HIGH)],
    );
    expect(report.overallAssessment).toBe('NEEDS_HUMAN_REVIEW');
  });

  it('collects suggested actions from open issues into nextActions (de-duplicated)', () => {
    const issues = [
      issue(Severity.CRITICAL, { suggestedAction: 'fix weights' }),
      issue(Severity.HIGH, { suggestedAction: 'fix weights' }),
      issue(Severity.MEDIUM, { suggestedAction: 'add bill of lading' }),
    ];
    const report = buildReadinessReport(
      'SHIP-4',
      { status: 'BLOCKED', humanReviewRequired: true },
      issues,
    );

    expect(report.nextActions).toEqual(['fix weights', 'add bill of lading']);
  });
});
