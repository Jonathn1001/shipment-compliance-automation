import type { Shipment } from '../../api/types';
import { fmt } from './format';

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

export function Overview({ s }: { s: Shipment }) {
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
