import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import {
  buildCreatePayload,
  emptyNewShipmentForm,
  validateCreateForm,
  type FormErrors,
  type NewShipmentForm,
} from '../pages/new-shipment/newShipmentForm';

interface Field {
  name: keyof NewShipmentForm;
  label: string;
  placeholder?: string;
  required?: boolean;
  wide?: boolean;
  inputMode?: 'decimal';
}

// Curated core: reference (required) + the fields an operator most often has up
// front. The remaining shipment fields are hydrated later from documents.
const FIELDS: Field[] = [
  { name: 'shipmentReference', label: 'Shipment reference', placeholder: 'SAF-IMP-2026-0001', required: true, wide: true },
  { name: 'importer', label: 'Importer', placeholder: 'Acme Importers Ltd' },
  { name: 'exporter', label: 'Exporter', placeholder: 'Shenzhen Widgets Co' },
  { name: 'goodsDescription', label: 'Goods description', placeholder: 'Laptop computers', wide: true },
  { name: 'hsCode', label: 'HS code', placeholder: '8471.30' },
  { name: 'countryOfOrigin', label: 'Country of origin', placeholder: 'DE' },
  { name: 'invoiceValue', label: 'Invoice value', placeholder: '12500.00', inputMode: 'decimal' },
  { name: 'currency', label: 'Currency', placeholder: 'USD' },
  { name: 'packagingType', label: 'Packaging type', placeholder: 'Carton' },
];

export function NewShipmentModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [form, setForm] = useState<NewShipmentForm>(emptyNewShipmentForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const set = (name: keyof NewShipmentForm, value: string) => {
    setForm((f) => ({ ...f, [name]: value }));
    // Clear a field's error as soon as the user edits it.
    if (errors[name]) setErrors((e) => ({ ...e, [name]: undefined }));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const found = validateCreateForm(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    setApiError(null);
    try {
      const shipment = await api.createShipment(buildCreatePayload(form));
      onClose();
      navigate(`/shipments/${shipment.id}`);
    } catch (err) {
      setApiError(err instanceof ApiError ? err.message : 'Could not create the shipment.');
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onMouseDown={onClose} role="presentation">
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-shipment-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="modal-head">
          <h2 id="new-shipment-title">New shipment</h2>
          <button type="button" className="modal-close" aria-label="Close" onClick={onClose}>
            &times;
          </button>
        </header>

        <form className="modal-body form-grid" onSubmit={submit} noValidate>
          <p className="form-hint form-wide">
            Only a reference is required — the rest can be filled now or hydrated later from documents.
          </p>

          {FIELDS.map((f) => (
            <label key={f.name} className={`field${f.wide ? ' field-wide' : ''}`}>
              <span className="field-label">
                {f.label}
                {f.required && <span className="req" aria-hidden="true"> *</span>}
              </span>
              <input
                className={`input${errors[f.name] ? ' input-err' : ''}`}
                value={form[f.name]}
                onChange={(e) => set(f.name, e.target.value)}
                placeholder={f.placeholder}
                inputMode={f.inputMode}
                autoFocus={f.name === 'shipmentReference'}
                aria-invalid={errors[f.name] ? true : undefined}
              />
              {errors[f.name] && <span className="field-err">{errors[f.name]}</span>}
            </label>
          ))}

          {apiError && <div className="notice err form-wide">{apiError}</div>}

          <div className="modal-actions form-wide">
            <button type="button" className="btn ghost" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create shipment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
