import type { CreateShipmentInput } from '../../api/types';

/**
 * The New Shipment modal's form state. Every field is a string because it comes
 * straight from an <input>; `buildCreatePayload` coerces and prunes it into the
 * API shape. Only `shipmentReference` is required — the backend accepts a partial
 * shipment that is later hydrated from ingested documents.
 */
export interface NewShipmentForm {
  shipmentReference: string;
  importer: string;
  exporter: string;
  goodsDescription: string;
  hsCode: string;
  countryOfOrigin: string;
  invoiceValue: string;
  currency: string;
  packagingType: string;
}

export const emptyNewShipmentForm: NewShipmentForm = {
  shipmentReference: '',
  importer: '',
  exporter: '',
  goodsDescription: '',
  hsCode: '',
  countryOfOrigin: '',
  invoiceValue: '',
  currency: '',
  packagingType: '',
};

export type FormErrors = Partial<Record<keyof NewShipmentForm, string>>;

/** The optional string fields (shared by the form and the payload), in order. */
const OPTIONAL_STRING_FIELDS = [
  'importer',
  'exporter',
  'goodsDescription',
  'hsCode',
  'countryOfOrigin',
  'packagingType',
] as const;

/**
 * Client-side mirror of the CreateShipmentDto constraints — enough to give fast
 * inline feedback. The backend stays the authority; its 422s are surfaced too.
 */
export function validateCreateForm(form: NewShipmentForm): FormErrors {
  const errors: FormErrors = {};

  if (!form.shipmentReference.trim()) {
    errors.shipmentReference = 'Shipment reference is required.';
  }

  const invoiceValue = form.invoiceValue.trim();
  if (invoiceValue !== '') {
    const n = Number(invoiceValue);
    if (!Number.isFinite(n)) {
      errors.invoiceValue = 'Invoice value must be a number.';
    } else if (n < 0) {
      errors.invoiceValue = 'Invoice value cannot be negative.';
    } else if (!/^\d+(\.\d{1,2})?$/.test(invoiceValue)) {
      errors.invoiceValue = 'At most two decimal places.';
    }
  }

  const currency = form.currency.trim();
  if (currency !== '' && !/^[A-Za-z]{3}$/.test(currency)) {
    errors.currency = 'Use a 3-letter code, e.g. USD.';
  }

  return errors;
}

/**
 * Turn the string form into the API payload: trim everything, drop blank
 * optionals, coerce the invoice value to a number, and normalise the currency to
 * uppercase. Assumes the form has already passed `validateCreateForm`.
 */
export function buildCreatePayload(form: NewShipmentForm): CreateShipmentInput {
  const payload: CreateShipmentInput = {
    shipmentReference: form.shipmentReference.trim(),
  };

  for (const field of OPTIONAL_STRING_FIELDS) {
    const value = form[field].trim();
    if (value !== '') payload[field] = value;
  }

  const invoiceValue = form.invoiceValue.trim();
  if (invoiceValue !== '') payload.invoiceValue = Number(invoiceValue);

  const currency = form.currency.trim();
  if (currency !== '') payload.currency = currency.toUpperCase();

  return payload;
}
