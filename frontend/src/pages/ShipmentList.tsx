import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import type { ShipmentListRow } from '../api/types';
import { StatusBadge } from '../components/StatusBadge';

const PAGE_SIZE = 50;

const fmtDate = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

export function ShipmentList() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<ShipmentListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // A page shorter than PAGE_SIZE means there is nothing left to fetch.
  const [reachedEnd, setReachedEnd] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    api
      .listShipments({ limit: PAGE_SIZE })
      .then((page) => {
        if (!active) return;
        setRows(page);
        setReachedEnd(page.length < PAGE_SIZE);
      })
      .catch((e: unknown) => active && setError(e instanceof Error ? e.message : String(e)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const loadMore = async () => {
    const last = rows[rows.length - 1];
    if (!last) return;
    setLoadingMore(true);
    try {
      const page = await api.listShipments({ limit: PAGE_SIZE, cursor: last.id });
      setRows((prev) => [...prev, ...page]);
      setReachedEnd(page.length < PAGE_SIZE);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingMore(false);
    }
  };

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
            {rows.map((s) => (
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
        {!loading && rows.length === 0 && <div className="empty-state">No shipments yet.</div>}
      </div>

      {!loading && !reachedEnd && rows.length > 0 && (
        <button className="btn" onClick={loadMore} disabled={loadingMore} style={{ marginTop: 16 }}>
          {loadingMore ? 'Loading…' : 'Load more'}
        </button>
      )}
    </section>
  );
}
