import type { DocumentType } from '../../api/types';

/** Best-effort document type from the file name, so the operator rarely re-picks. */
export function guessDocType(fileName: string): DocumentType | null {
  const n = fileName.toLowerCase();
  if (n.includes('invoice')) return 'COMMERCIAL_INVOICE';
  if (n.includes('packing')) return 'PACKING_LIST';
  if (n.includes('lading') || n.includes('bill') || /\bbl\b/.test(n)) return 'BILL_OF_LADING';
  if (n.includes('form-e') || n.includes('form_e') || n.includes('cert')) return 'CERTIFICATE_FORM_E';
  return null;
}
