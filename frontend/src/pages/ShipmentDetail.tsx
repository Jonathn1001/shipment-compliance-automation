import { useCallback, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import type {
  AuditLog,
  DocumentIngestion,
  ReadinessReport,
  Shipment,
  ShipmentStatus,
  ValidationIssue,
  ValidationStep,
} from '../api/types';
import { PipelineStepper } from '../components/PipelineStepper';
import { StatusBadge } from '../components/StatusBadge';
import { useAsync } from '../hooks/useAsync';
import { Audit } from './shipment-detail/Audit';
import { Documents } from './shipment-detail/Documents';
import { Issues } from './shipment-detail/Issues';
import { Overview } from './shipment-detail/Overview';
import { Report } from './shipment-detail/Report';
import { TabButton, type Tab } from './shipment-detail/TabButton';

interface Bundle {
  shipment: Shipment;
  documents: DocumentIngestion[];
  issues: ValidationIssue[];
  report: ReadinessReport | null;
  audit: AuditLog[];
}

export function ShipmentDetail() {
  const { id = '' } = useParams();
  const [tab, setTab] = useState<Tab>('overview');
  const [validating, setValidating] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [pipeline, setPipeline] = useState<
    { steps: ValidationStep[]; status: ShipmentStatus } | null
  >(null);

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
    setPipeline(null);
    try {
      const result = await api.validate(id);
      setPipeline({ steps: result.trace, status: result.status });
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
      <Link to="/shipments" className="back">← Back to queue</Link>

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

      {pipeline && (
        <PipelineStepper
          key={pipeline.steps.map((s) => JSON.stringify(s.detail)).join('|')}
          steps={pipeline.steps}
          finalStatus={pipeline.status}
        />
      )}

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
        {tab === 'documents' && (
          <Documents docs={documents} shipmentId={id} onIngested={reload} />
        )}
        {tab === 'issues' && <Issues issues={issues} />}
        {tab === 'report' && <Report report={report} />}
        {tab === 'audit' && <Audit entries={audit} />}
      </div>
    </section>
  );
}
