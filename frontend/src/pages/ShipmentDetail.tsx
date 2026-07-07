import { useCallback, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import type {
  AuditLog,
  DocumentIngestion,
  ReadinessReport,
  Shipment,
  ValidationIssue,
} from '../api/types';
import { StatusBadge } from '../components/StatusBadge';
import { useAsync } from '../hooks/useAsync';

type Tab = 'overview' | 'documents' | 'issues' | 'report' | 'audit';

interface Bundle {
  shipment: Shipment;
  documents: DocumentIngestion[];
  issues: ValidationIssue[];
  report: ReadinessReport | null;
  audit: AuditLog[];
}

const fmt = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

export function ShipmentDetail() {
  const { id = '' } = useParams();
  const [tab, setTab] = useState<Tab>('overview');
  const [validating, setValidating] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  // Load every tab's data in parallel — one round-trip fan-out, no waterfall.
  const load = useCallback(async (): Promise<Bundle> => {
    const [shipment, documents, issues, report, audit] = await Promise.all([
      api.getShipment(id),
      api.getDocuments(id),
      api.getIssues(id),
      api.getReadinessReport(id),
      api.getAuditLog(id),
    ]);
    return { shipment, documents, issues, report, audit };
  }, [id]);

  const { data, loading, error, reload } = useAsync(load, [id]);

  const runValidation = async () => {
    setValidating(true);
    setFlash(null);
    try {
      const result = await api.validate(id);
      setFlash(`Validation complete — status is now ${result.status}.`);
      reload();
    } catch (e) {
      setFlash(e instanceof Error ? e.message : 'Validation failed.');
    } finally {
      setValidating(false);
    }
  };

  if (error) return <div className="notice err">Could not load shipment: {error}</div>;
  if (!data) return <div className="empty-state">Loading…</div>;

  const { shipment, documents, issues, report, audit } = data;
  const openIssues = issues.filter((i) => i.status === 'OPEN');

  return (
    <section>
      <Link to="/" className="back">← Back to queue</Link>

      <div className={`ship-head status-${shipment.currentStatus}`}>
        <div>
          <div className="ref-lg">{shipment.shipmentReference}</div>
          <div className="who">{shipment.importer ?? 'Importer not set'}</div>
        </div>
        <StatusBadge status={shipment.currentStatus} />
        <div className="spacer" />
        <button className="btn" onClick={runValidation} disabled={validating}>
          {validating ? 'Validating…' : 'Run validation'}
        </button>
      </div>

      {flash && <div className="notice info" style={{ marginTop: 14 }}>{flash}</div>}

      <div className="tabs" role="tablist">
        <TabButton id="overview" tab={tab} setTab={setTab}>Overview</TabButton>
        <TabButton id="documents" tab={tab} setTab={setTab} count={documents.length}>Documents</TabButton>
        <TabButton id="issues" tab={tab} setTab={setTab} count={openIssues.length}>Issues</TabButton>
        <TabButton id="report" tab={tab} setTab={setTab}>Readiness Report</TabButton>
        <TabButton id="audit" tab={tab} setTab={setTab} count={audit.length}>Audit Log</TabButton>
      </div>

      <div className="panel" role="tabpanel">
        {loading && <div className="empty-state">Refreshing…</div>}
        {tab === 'overview' && <Overview s={shipment} />}
        {tab === 'documents' && <Documents docs={documents} />}
        {tab === 'issues' && <Issues issues={issues} />}
        {tab === 'report' && <Report report={report} />}
        {tab === 'audit' && <Audit entries={audit} />}
      </div>
    </section>
  );
}

function TabButton({
  id,
  tab,
  setTab,
  count,
  children,
}: {
  id: Tab;
  tab: Tab;
  setTab: (t: Tab) => void;
  count?: number;
  children: string;
}) {
  return (
    <button className="tab" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}>
      {children}
      {count !== undefined && <span className="tab-count">{count}</span>}
    </button>
  );
}

const FIELDS: { key: keyof Shipment; label: string }[] = [
  { key: 'exporter', label: 'Exporter' },
  { key: 'importer', label: 'Importer' },
  { key: 'goodsDescription', label: 'Goods' },
  { key: 'hsCode', label: 'HS code' },
  { key: 'countryOfOrigin', label: 'Origin' },
  { key: 'invoiceNumber', label: 'Invoice no.' },
  { key: 'invoiceValue', label: 'Invoice value' },
  { key: 'currency', label: 'Currency' },
  { key: 'grossWeightKg', label: 'Gross (kg)' },
  { key: 'netWeightKg', label: 'Net (kg)' },
  { key: 'numberOfPackages', label: 'Packages' },
  { key: 'containerNumber', label: 'Container' },
  { key: 'billOfLadingNumber', label: 'Bill of lading' },
  { key: 'packagingType', label: 'Packaging' },
  { key: 'ispm15Certified', label: 'ISPM15' },
  { key: 'eformCertificate', label: 'Form-E' },
  { key: 'freightMode', label: 'Freight mode' },
  { key: 'arrivalDate', label: 'Arrival' },
];

function Overview({ s }: { s: Shipment }) {
  return (
    <dl className="defs">
      {FIELDS.map(({ key, label }) => {
        const raw = s[key];
        const value =
          raw === null || raw === undefined
            ? null
            : typeof raw === 'boolean'
              ? raw ? 'Yes' : 'No'
              : key === 'arrivalDate'
                ? fmt(String(raw))
                : String(raw);
        return (
          <div className="def" key={key}>
            <dt>{label}</dt>
            {value === null ? <dd className="empty">not set</dd> : <dd>{value}</dd>}
          </div>
        );
      })}
    </dl>
  );
}

function Documents({ docs }: { docs: DocumentIngestion[] }) {
  if (docs.length === 0) return <div className="empty-state">No documents ingested.</div>;
  return (
    <>
      {docs.map((d) => (
        <div className="card" key={d.id}>
          <div className="issue-head">
            <span className="type">{d.documentType}</span>
            <span className="field">source: {d.sourceType}</span>
            <span className="st">{fmt(d.createdAt)}</span>
          </div>
          <pre className="json">{JSON.stringify(d.mappedFields, null, 2)}</pre>
        </div>
      ))}
    </>
  );
}

function Issues({ issues }: { issues: ValidationIssue[] }) {
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

function Report({ report }: { report: ReadinessReport | null }) {
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

function Audit({ entries }: { entries: AuditLog[] }) {
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
