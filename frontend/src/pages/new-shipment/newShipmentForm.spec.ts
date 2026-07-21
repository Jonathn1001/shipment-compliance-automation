import { describe, expect, it } from 'vitest';
import {
  buildCreatePayload,
  emptyNewShipmentForm,
  validateCreateForm,
  type NewShipmentForm,
} from './newShipmentForm';

const form = (over: Partial<NewShipmentForm> = {}): NewShipmentForm => ({
  ...emptyNewShipmentForm,
  ...over,
});

describe('validateCreateForm', () => {
  it('requires a shipment reference', () => {
    expect(validateCreateForm(form()).shipmentReference).toBeTruthy();
    expect(validateCreateForm(form({ shipmentReference: '   ' })).shipmentReference).toBeTruthy();
  });

  it('accepts a reference-only form', () => {
    expect(validateCreateForm(form({ shipmentReference: 'SAF-1' }))).toEqual({});
  });

  it('rejects a non-numeric invoice value', () => {
    const errors = validateCreateForm(form({ shipmentReference: 'SAF-1', invoiceValue: 'abc' }));
    expect(errors.invoiceValue).toBeTruthy();
  });

  it('rejects a negative invoice value', () => {
    const errors = validateCreateForm(form({ shipmentReference: 'SAF-1', invoiceValue: '-5' }));
    expect(errors.invoiceValue).toBeTruthy();
  });

  it('rejects more than two decimal places on invoice value', () => {
    const errors = validateCreateForm(form({ shipmentReference: 'SAF-1', invoiceValue: '10.999' }));
    expect(errors.invoiceValue).toBeTruthy();
  });

  it('accepts a valid two-decimal invoice value', () => {
    expect(validateCreateForm(form({ shipmentReference: 'SAF-1', invoiceValue: '48250.50' }))).toEqual({});
  });

  it('rejects a currency that is not three letters', () => {
    expect(validateCreateForm(form({ shipmentReference: 'SAF-1', currency: 'US' })).currency).toBeTruthy();
    expect(validateCreateForm(form({ shipmentReference: 'SAF-1', currency: 'US1' })).currency).toBeTruthy();
  });

  it('accepts a three-letter currency in any case', () => {
    expect(validateCreateForm(form({ shipmentReference: 'SAF-1', currency: 'usd' }))).toEqual({});
  });
});

describe('buildCreatePayload', () => {
  it('sends only the trimmed reference when everything else is blank', () => {
    expect(buildCreatePayload(form({ shipmentReference: '  SAF-1  ' }))).toEqual({
      shipmentReference: 'SAF-1',
    });
  });

  it('drops empty optional fields entirely', () => {
    const payload = buildCreatePayload(form({ shipmentReference: 'SAF-1', importer: '   ' }));
    expect(payload).not.toHaveProperty('importer');
  });

  it('coerces the invoice value to a number', () => {
    const payload = buildCreatePayload(form({ shipmentReference: 'SAF-1', invoiceValue: '48250.50' }));
    expect(payload.invoiceValue).toBe(48250.5);
    expect(typeof payload.invoiceValue).toBe('number');
  });

  it('uppercases the currency code', () => {
    expect(buildCreatePayload(form({ shipmentReference: 'SAF-1', currency: 'usd' })).currency).toBe('USD');
  });

  it('trims and includes populated optional strings', () => {
    const payload = buildCreatePayload(
      form({ shipmentReference: 'SAF-1', importer: '  Acme  ', hsCode: '8471.30' }),
    );
    expect(payload.importer).toBe('Acme');
    expect(payload.hsCode).toBe('8471.30');
  });
});
