import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { useAsync } from '../hooks/useAsync';

const fmtDate = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

export function ShipmentList() {
  const navigate = useNavigate();
  const load = useCallback(() => api.listShipments(), []);
  const { data, loading, error } = useAsync(load, []);

  return (
    <section>
      <p className="eyebrow">Triage queue</p>
      {error && <div className="notice err">Could not load shipments: {error}</div>}

      <div className="table-wrap">
        <table className="grid">
          <thead>
            <tr>
              <th>Reference</th>
              <th>Importer</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Open issues</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((s) => (
              <tr
                key={s.id}
                onClick={() => navigate(`/shipments/${s.id}`)}
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && navigate(`/shipments/${s.id}`)}
              >
                <td className="ref">{s.shipmentReference}</td>
                <td className={s.importer ? '' : 'dim'}>{s.importer ?? '—'}</td>
                <td>
                  <StatusBadge status={s.currentStatus} />
                </td>
                <td className="num">
                  <span className={`count${s.openIssueCount > 0 ? ' has' : ''}`}>{s.openIssueCount}</span>
                </td>
                <td className="dim mono" style={{ fontSize: 12 }}>{fmtDate(s.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && <div className="empty-state">Loading…</div>}
        {!loading && data?.length === 0 && <div className="empty-state">No shipments yet.</div>}
      </div>
    </section>
  );
}
