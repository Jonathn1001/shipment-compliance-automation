import type {
  AuditLog,
  DocumentIngestion,
  IngestDocumentInput,
  ReadinessReport,
  Shipment,
  ShipmentListRow,
  ShipmentStats,
  ValidationIssue,
  ValidationRunResult,
} from './types';

/** The backend wraps success as `{ data }` and failures as `{ error }`. */
interface SuccessEnvelope<T> {
  data: T;
}
interface ErrorEnvelope {
  error: { statusCode: number; message: string | string[]; error: string };
}

export class ApiError extends Error {
  constructor(
    readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Build a `?a=1&b=2` query string, dropping undefined/empty values. */
function qs(params?: Record<string, string | number | undefined>): string {
  if (!params) return '';
  const pairs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`);
  return pairs.length ? `?${pairs.join('&')}` : '';
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { 'content-type': 'application/json' },
    ...init,
  });
  const body: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    const err = body as ErrorEnvelope | null;
    const message = err?.error?.message
      ? Array.isArray(err.error.message)
        ? err.error.message.join(', ')
        : err.error.message
      : `Request failed (${res.status})`;
    throw new ApiError(res.status, message);
  }

  return (body as SuccessEnvelope<T>).data;
}

export const api = {
  // Keyset pagination: pass the id of the last row held as `cursor` for the next
  // page. A page shorter than `limit` means the end has been reached.
  listShipments: (params?: { limit?: number; cursor?: string }) =>
    request<ShipmentListRow[]>(`/shipments${qs(params)}`),
  getStats: () => request<ShipmentStats>('/shipments/stats'),
  getShipment: (id: string) => request<Shipment>(`/shipments/${id}`),
  getDocuments: (id: string) => request<DocumentIngestion[]>(`/shipments/${id}/documents`),
  ingestDocument: (id: string, input: IngestDocumentInput) =>
    request<DocumentIngestion>(`/shipments/${id}/documents`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  getIssues: (id: string) => request<ValidationIssue[]>(`/shipments/${id}/issues`),
  getReadinessReport: (id: string) =>
    request<ReadinessReport | null>(`/shipments/${id}/readiness-report`),
  getAuditLog: (id: string) => request<AuditLog[]>(`/shipments/${id}/audit-log`),
  validate: (id: string) =>
    request<ValidationRunResult>(`/shipments/${id}/validate`, { method: 'POST' }),
};
