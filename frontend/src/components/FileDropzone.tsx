import { useRef, useState, type DragEvent } from 'react';
import {
  DocumentParseError,
  parseDocumentFile,
  type ParsedDocument,
} from '../lib/parseDocumentFile';

/**
 * Drag-and-drop (or click-to-browse) upload zone. Reads and parses the file in
 * the browser and hands the resulting payload up; it never uploads a binary. Only
 * structured data is accepted — the backend does no OCR.
 */
export function FileDropzone({
  onParsed,
  onError,
}: {
  onParsed: (parsed: ParsedDocument, fileName: string) => void;
  onError: (message: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const handle = async (file: File | undefined) => {
    if (!file) return;
    try {
      const parsed = await parseDocumentFile(file);
      onParsed(parsed, file.name);
    } catch (e) {
      onError(
        e instanceof DocumentParseError
          ? e.message
          : 'Could not read that file.',
      );
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    void handle(e.dataTransfer.files?.[0]);
  };

  return (
    <div
      className={`dropzone${over ? ' over' : ''}`}
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
    >
      <div className="dz-icon" aria-hidden="true">⤓</div>
      <div className="dz-main">
        <b>Drop a document</b> or click to browse
      </div>
      <div className="dz-sub">Structured data only — .json, .csv, .txt (no OCR)</div>
      <input
        ref={inputRef}
        type="file"
        accept=".json,.csv,.txt,application/json,text/csv,text/plain"
        hidden
        onChange={(e) => {
          void handle(e.target.files?.[0]);
          e.target.value = ''; // allow re-selecting the same file
        }}
      />
    </div>
  );
}
