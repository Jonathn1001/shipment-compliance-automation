import { describe, expect, it } from 'vitest';
import { DocumentParseError, parseDocumentFile } from './parseDocumentFile';

/** Build a File the way the dropzone hands one over (Node 22 has File global). */
const file = (content: string, name: string) => new File([content], name);

describe('parseDocumentFile', () => {
  describe('JSON', () => {
    it('parses a .json object payload', async () => {
      const result = await parseDocumentFile(
        file('{"importer":"Globex","invoice_value":1200}', 'invoice.json'),
      );
      expect(result.sourceType).toBe('JSON');
      expect(result.format).toBe('JSON');
      expect(result.payload).toEqual({ importer: 'Globex', invoice_value: 1200 });
    });

    it('treats a brace-leading .txt as JSON by content', async () => {
      const result = await parseDocumentFile(file('{"importer":"Acme"}', 'notes.txt'));
      expect(result.sourceType).toBe('JSON');
      expect(result.payload).toEqual({ importer: 'Acme' });
    });

    it('rejects malformed JSON', async () => {
      await expect(parseDocumentFile(file('{ not json', 'bad.json'))).rejects.toThrow(
        /not valid JSON/,
      );
    });

    it('rejects a JSON array (must be an object)', async () => {
      await expect(parseDocumentFile(file('[1,2,3]', 'arr.json'))).rejects.toThrow(
        /Expected a JSON object/,
      );
    });
  });

  describe('CSV', () => {
    it('maps a header + first data row to one record', async () => {
      const result = await parseDocumentFile(
        file('importer,currency\nGlobex,USD', 'row.csv'),
      );
      expect(result.sourceType).toBe('CSV');
      expect(result.format).toBe('CSV');
      expect(result.payload).toEqual({ importer: 'Globex', currency: 'USD' });
    });

    it('honors quoted fields containing commas and "" escapes', async () => {
      const result = await parseDocumentFile(
        file('goods,note\n"widgets, boxed","said ""hi"""', 'q.csv'),
      );
      expect(result.payload).toEqual({ goods: 'widgets, boxed', note: 'said "hi"' });
    });

    it('fills missing trailing columns with empty strings', async () => {
      const result = await parseDocumentFile(file('a,b,c\n1,2', 'short.csv'));
      expect(result.payload).toEqual({ a: '1', b: '2', c: '' });
    });

    it('rejects a header-only CSV', async () => {
      await expect(parseDocumentFile(file('a,b,c', 'headeronly.csv'))).rejects.toThrow(
        /header row and at least one data row/,
      );
    });
  });

  describe('key/value text', () => {
    it('reads "key: value" and "key = value" lines', async () => {
      const result = await parseDocumentFile(
        file('importer: Globex\ncurrency = USD', 'doc.txt'),
      );
      expect(result.sourceType).toBe('JSON');
      expect(result.format).toBe('key/value text');
      expect(result.payload).toEqual({ importer: 'Globex', currency: 'USD' });
    });

    it('rejects text with no parseable fields', async () => {
      await expect(parseDocumentFile(file('just prose, no fields', 'x.txt'))).rejects.toThrow(
        /Could not read any fields/,
      );
    });
  });

  describe('guards', () => {
    it('rejects binary extensions before reading', async () => {
      await expect(parseDocumentFile(file('%PDF-1.7', 'scan.pdf'))).rejects.toThrow(
        DocumentParseError,
      );
      await expect(parseDocumentFile(file('%PDF-1.7', 'scan.pdf'))).rejects.toThrow(/OCR/);
    });

    it('rejects files over the 1 MB limit', async () => {
      const big = 'x'.repeat(1_000_001);
      await expect(parseDocumentFile(file(big, 'big.json'))).rejects.toThrow(/too large/);
    });

    it('rejects an empty file', async () => {
      await expect(parseDocumentFile(file('   ', 'empty.json'))).rejects.toThrow(
        /file is empty/,
      );
    });
  });
});
