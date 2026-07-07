import { Severity } from '../../generated/prisma/client';
import { resolveStatus } from './status-resolver';

const sev = (severity: Severity) => ({ severity });

describe('resolveStatus (severity -> readiness status)', () => {
  it('returns READY with no human review when there are no issues', () => {
    expect(resolveStatus([])).toEqual({
      status: 'READY',
      humanReviewRequired: false,
    });
  });

  it('returns READY when only LOW issues are present', () => {
    expect(resolveStatus([sev(Severity.LOW), sev(Severity.LOW)])).toEqual({
      status: 'READY',
      humanReviewRequired: false,
    });
  });

  it('returns NEEDS_REVIEW when the highest severity is MEDIUM', () => {
    expect(resolveStatus([sev(Severity.LOW), sev(Severity.MEDIUM)])).toEqual({
      status: 'NEEDS_REVIEW',
      humanReviewRequired: true,
    });
  });

  it('returns NEEDS_REVIEW when the highest severity is HIGH', () => {
    expect(resolveStatus([sev(Severity.HIGH)])).toEqual({
      status: 'NEEDS_REVIEW',
      humanReviewRequired: true,
    });
  });

  it('returns BLOCKED when any CRITICAL issue is present', () => {
    expect(
      resolveStatus([
        sev(Severity.LOW),
        sev(Severity.CRITICAL),
        sev(Severity.HIGH),
      ]),
    ).toEqual({
      status: 'BLOCKED',
      humanReviewRequired: true,
    });
  });
});
