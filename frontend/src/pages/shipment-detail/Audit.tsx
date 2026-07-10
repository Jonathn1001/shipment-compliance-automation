import type { AuditLog } from '../../api/types';
import { fmt } from './format';

export function Audit({ entries }: { entries: AuditLog[] }) {
  if (entries.length === 0) return <div className="empty-state">No audit entries.</div>;
  return (
    <div className="table-wrap">
      <table className="log">
        <thead>
          <tr>
            <th>When</th>
            <th>Action</th>
            <th>Actor</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.id}>
              <td className="when">{fmt(e.timestamp)}</td>
              <td className="act">{e.action}</td>
              <td className="mono" style={{ fontSize: 12 }}>{e.actor}</td>
              <td className="detail">{e.details ? JSON.stringify(e.details) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
