import { useState, type FormEvent } from 'react';
import { api } from '../../api/client';
import type { DocumentIngestion, DocumentType, SourceType } from '../../api/types';
import { FileDropzone } from '../../components/FileDropzone';
import type { ParsedDocument } from '../../lib/parseDocumentFile';
import { fmt } from './format';
import { guessDocType } from './guessDocType';

const DOC_TYPES: DocumentType[] = [
  'COMMERCIAL_INVOICE',
  'PACKING_LIST',
  'BILL_OF_LADING',
  'CERTIFICATE_FORM_E',
  'OTHER',
];
const SOURCE_TYPES: SourceType[] = ['JSON', 'OCR', 'API', 'CSV'];

export function Documents({
  docs,
  shipmentId,
  onIngested,
}: {
  docs: DocumentIngestion[];
  shipmentId: string;
  onIngested: () => void;
}) {
  const [docType, setDocType] = useState<DocumentType>('COMMERCIAL_INVOICE');
  const [srcType, setSrcType] = useState<SourceType>('JSON');
  const [payload, setPayload] = useState('{\n  "importer": "Globex Trading"\n}');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'err' | 'info'; text: string } | null>(null);
  const [uploaded, setUploaded] = useState<string | null>(null);

  // A dropped/opened file is parsed in the browser and used to fill the form —
  // the operator can review or edit the payload before it is ingested.
  const onParsed = (parsed: ParsedDocument, fileName: string) => {
    setPayload(JSON.stringify(parsed.payload, null, 2));
    setSrcType(parsed.sourceType);
    const guessed = guessDocType(fileName);
    if (guessed) setDocType(guessed);
    setUploaded(fileName);
    setMsg({ kind: 'info', text: `Read ${fileName} as ${parsed.format}. Review and ingest.` });
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setMsg(null);

    // The payload must parse to a JSON object — the backend maps its fields into
    // the canonical record. Catch the parse/shape error client-side so the
    // reviewer gets an immediate, specific message instead of a 422 round-trip.
    let parsed: unknown;
    try {
      parsed = JSON.parse(payload);
    } catch {
      setMsg({ kind: 'err', text: 'Payload is not valid JSON.' });
      return;
    }
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      setMsg({ kind: 'err', text: 'Payload must be a JSON object, e.g. { "importer": "…" }.' });
      return;
    }

    setBusy(true);
    try {
      await api.ingestDocument(shipmentId, {
        documentType: docType,
        sourceType: srcType,
        payload: parsed as Record<string, unknown>,
      });
      setMsg({ kind: 'info', text: 'Document ingested — fields reconciled into the shipment.' });
      onIngested(); // refetch so the new document, filled fields and audit entries appear
    } catch (err) {
      setMsg({ kind: 'err', text: err instanceof Error ? err.message : 'Ingest failed.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <form className="ingest-form" onSubmit={submit}>
        <p className="eyebrow">Upload a document</p>
        <FileDropzone onParsed={onParsed} onError={(text) => setMsg({ kind: 'err', text })} />
        {uploaded && (
          <p className="dz-file">Loaded <b>{uploaded}</b> — review or edit the payload below.</p>
        )}
        <p className="dz-or"><span>or enter data manually</span></p>
        <div className="ingest-row">
          <label>
            Document type
            <select value={docType} onChange={(e) => setDocType(e.target.value as DocumentType)}>
              {DOC_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>
          <label>
            Source
            <select value={srcType} onChange={(e) => setSrcType(e.target.value as SourceType)}>
              {SOURCE_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>
        </div>
        <label className="ingest-payload">
          Payload (JSON)
          <textarea
            rows={5}
            value={payload}
            spellCheck={false}
            onChange={(e) => setPayload(e.target.value)}
          />
        </label>
        {msg && <div className={`notice ${msg.kind}`} style={{ marginBottom: 12 }}>{msg.text}</div>}
        <button className="btn" type="submit" disabled={busy}>
          {busy ? 'Ingesting…' : 'Ingest document'}
        </button>
      </form>

      {docs.length === 0 ? (
        <div className="empty-state">No documents ingested yet.</div>
      ) : (
        docs.map((d) => (
          <div className="card" key={d.id}>
            <div className="issue-head">
              <span className="type">{d.documentType}</span>
              <span className="field">source: {d.sourceType}</span>
              <span className="st">{fmt(d.createdAt)}</span>
            </div>
            <pre className="json">{JSON.stringify(d.mappedFields, null, 2)}</pre>
          </div>
        ))
      )}
    </>
  );
}
