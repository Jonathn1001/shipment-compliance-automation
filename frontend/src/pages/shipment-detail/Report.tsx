import type { ReadinessReport } from '../../api/types';
import { fmt } from './format';

export function Report({ report }: { report: ReadinessReport | null }) {
  if (!report) return <div className="empty-state">No readiness report yet — run validation.</div>;
  return (
    <div>
      <div className="tiles">
        <div className="tile">
          <div className="k">Assessment</div>
          <div className="v" style={{ fontSize: 15 }}>{report.overallAssessment.replace(/_/g, ' ')}</div>
        </div>
        <div className="tile">
          <div className="k">Total issues</div>
          <div className="v">{report.totalIssues}</div>
        </div>
        <div className="tile crit">
          <div className="k">Critical</div>
          <div className="v">{report.criticalCount}</div>
        </div>
        <div className="tile warn">
          <div className="k">Warnings</div>
          <div className="v">{report.warningCount}</div>
        </div>
        <div className="tile">
          <div className="k">Human review</div>
          <div className="v" style={{ fontSize: 15 }}>{report.humanReviewRequired ? 'Required' : 'Not required'}</div>
        </div>
      </div>
      <p className="eyebrow">Suggested next actions</p>
      {report.nextActions.length === 0 ? (
        <div className="dim">None — shipment is clear.</div>
      ) : (
        <ul className="actions">
          {report.nextActions.map((a, idx) => (
            <li key={idx}>{a}</li>
          ))}
        </ul>
      )}
      <div className="dim mono" style={{ fontSize: 12, marginTop: 16 }}>Generated {fmt(report.generatedAt)}</div>
    </div>
  );
}
