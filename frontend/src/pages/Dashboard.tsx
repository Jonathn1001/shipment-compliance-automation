import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import type { ShipmentListRow, ShipmentStats } from '../api/types';
import { SeverityDonut, TrendChart } from '../components/charts';
import { StatusBadge } from '../components/StatusBadge';
import { useAsync } from '../hooks/useAsync';

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

interface DashboardData {
  stats: ShipmentStats;
  recent: ShipmentListRow[];
}

export function Dashboard() {
  const navigate = useNavigate();

  // Stats and the recent list load in parallel — one fan-out, no waterfall.
  const load = useCallback(async (): Promise<DashboardData> => {
    const [stats, all] = await Promise.all([api.getStats(), api.listShipments()]);
    return { stats, recent: all.slice(0, 5) };
  }, []);
  const { data, loading, error } = useAsync(load, []);

  if (error) return <div className="notice err">Could not load dashboard: {error}</div>;
  if (!data) return <div className="empty-state">Loading…</div>;

  const { stats, recent } = data;
  const kpis = [
    { label: 'Total shipments', value: stats.total, tone: '' },
    { label: 'Ready to proceed', value: stats.byStatus.READY, tone: 'ok' },
    { label: 'Needs review', value: stats.byStatus.NEEDS_REVIEW, tone: 'warn' },
    { label: 'Blocked', value: stats.byStatus.BLOCKED, tone: 'crit' },
  ];

  return (
    <section className={loading ? 'is-refreshing' : ''}>
      <p className="eyebrow">Dashboard</p>

      <div className="kpis">
        {kpis.map((k) => (
          <div className={`kpi ${k.tone}`} key={k.label}>
            <div className="kpi-v">{k.value}</div>
            <div className="kpi-k">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="dash-grid">
        <div className="dash-card">
          <p className="eyebrow">Open issues by severity</p>
          <SeverityDonut counts={stats.openIssuesBySeverity} />
        </div>
        <div className="dash-card">
          <p className="eyebrow">Shipments over time</p>
          <TrendChart points={stats.shipmentsOverTime} />
        </div>
      </div>

      <div className="dash-recent">
        <div className="recent-head">
          <p className="eyebrow" style={{ margin: 0 }}>Recent shipments</p>
          <button className="link-btn" onClick={() => navigate('/shipments')}>
            View all shipments →
          </button>
        </div>
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
              {recent.map((s) => (
                <tr
                  key={s.id}
                  onClick={() => navigate(`/shipments/${s.id}`)}
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && navigate(`/shipments/${s.id}`)}
                >
                  <td className="ref">{s.shipmentReference}</td>
                  <td className={s.importer ? '' : 'dim'}>{s.importer ?? '—'}</td>
                  <td><StatusBadge status={s.currentStatus} /></td>
                  <td className="num">
                    <span className={`count${s.openIssueCount > 0 ? ' has' : ''}`}>
                      {s.openIssueCount}
                    </span>
                  </td>
                  <td className="dim mono" style={{ fontSize: 12 }}>{fmtDate(s.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {recent.length === 0 && <div className="empty-state">No shipments yet.</div>}
        </div>
      </div>
    </section>
  );
}
