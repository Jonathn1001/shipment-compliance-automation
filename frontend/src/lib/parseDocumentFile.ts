import type { SourceType } from '../api/types';

/**
 * Parse an uploaded document file into an ingest payload — entirely in the
 * browser. This is deliberately structured-data only (JSON / CSV / plain text):
 * the backend does no OCR, so binary formats (PDF, images, Office docs) are
 * rejected with a clear message rather than silently failing server-side. The
 * parsed object is handed to the existing, tested ingest endpoint unchanged.
 */

export interface ParsedDocument {
  payload: Record<string, unknown>;
  sourceType: SourceType;
  /** Human label of how it was read, for the UI (e.g. "JSON", "CSV"). */
  format: string;
}

/** Refuse oversized files before reading them into memory (client-side DoS). */
const MAX_BYTES = 1_000_000; // 1 MB — mock document data is small

const BINARY_EXT = new Set([
  'pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'tif', 'tiff',
  'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'zip', 'rar', '7z',
]);

const extOf = (name: string): string =>
  name.includes('.') ? name.split('.').pop()!.toLowerCase() : '';

export class DocumentParseError extends Error {}

export async function parseDocumentFile(file: File): Promise<ParsedDocument> {
  const ext = extOf(file.name);
  if (BINARY_EXT.has(ext)) {
    throw new DocumentParseError(
      `${ext.toUpperCase()} files need OCR, which this demo does not do. Upload structured data: .json, .csv or .txt.`,
    );
  }
  if (file.size > MAX_BYTES) {
    throw new DocumentParseError(
      `File is too large (${Math.ceil(file.size / 1000)} KB). The limit is ${MAX_BYTES / 1000} KB.`,
    );
  }

  const text = (await file.text()).trim();
  if (text === '') throw new DocumentParseError('The file is empty.');

  if (ext === 'json' || text.startsWith('{')) {
    return { payload: asObject(parseJson(text)), sourceType: 'JSON', format: 'JSON' };
  }
  if (ext === 'csv') {
    return { payload: parseCsv(text), sourceType: 'CSV', format: 'CSV' };
  }
  // .txt / unknown: try JSON, then fall back to key:value / key=value lines.
  try {
    return { payload: asObject(parseJson(text)), sourceType: 'JSON', format: 'JSON (text)' };
  } catch {
    return { payload: parseKeyValues(text), sourceType: 'JSON', format: 'key/value text' };
  }
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    throw new DocumentParseError('The file is not valid JSON.');
  }
}

function asObject(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new DocumentParseError('Expected a JSON object, e.g. { "importer": "…" }.');
  }
  return value as Record<string, unknown>;
}

/** Split a single CSV line, honoring double-quoted fields and "" escapes. */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else inQuotes = false;
      } else cur += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ',') { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

/** CSV as a header row + the first data row → one record. */
function parseCsv(text: string): Record<string, unknown> {
  const rows = text.split(/\r?\n/).filter((l) => l.trim() !== '');
  if (rows.length < 2) {
    throw new DocumentParseError('CSV needs a header row and at least one data row.');
  }
  const header = splitCsvLine(rows[0]);
  const values = splitCsvLine(rows[1]);
  const record: Record<string, unknown> = {};
  header.forEach((key, i) => {
    if (key !== '') record[key] = values[i] ?? '';
  });
  if (Object.keys(record).length === 0) {
    throw new DocumentParseError('No columns found in the CSV header.');
  }
  return record;
}

/** Plain text as `key: value` or `key = value` lines → one record. */
function parseKeyValues(text: string): Record<string, unknown> {
  const record: Record<string, unknown> = {};
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([^:=]+?)\s*[:=]\s*(.*)$/);
    if (m) record[m[1].trim()] = m[2].trim();
  }
  if (Object.keys(record).length === 0) {
    throw new DocumentParseError(
      'Could not read any fields. Use JSON, CSV, or "key: value" lines.',
    );
  }
  return record;
}
