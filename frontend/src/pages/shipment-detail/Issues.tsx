import type { ValidationIssue } from '../../api/types';

export function Issues({ issues }: { issues: ValidationIssue[] }) {
  if (issues.length === 0) return <div className="empty-state">No issues raised.</div>;
  return (
    <>
      {issues.map((i) => (
        <div className="card" key={i.id}>
          <div className="issue-head">
            <span className={`sev ${i.severity}`}>{i.severity}</span>
            <span className="type">{i.issueType}</span>
            {i.field && <span className="field">· {i.field}</span>}
            <span className="st">{i.status}</span>
          </div>
          <div className="issue-body">{i.explanation}</div>
          <div className="issue-action">
            <b>Fix:</b> {i.suggestedAction}
          </div>
        </div>
      ))}
    </>
  );
}
