import { DocumentType } from '../../generated/prisma/client';
import { mapDocument } from './field-mapper';

describe('mapDocument (field mapper)', () => {
  it('maps a commercial invoice payload to canonical fields', () => {
    const raw = {
      invoice_number: 'INV-1001',
      total_value: 12500.5,
      currency: 'USD',
      seller: 'Shenzhen Widgets Co',
      buyer: 'Acme Importers Ltd',
      hs_code: '8471.30',
      country_of_origin: 'CN',
      description: 'Laptop computers',
      unrelated_field: 'ignore me',
    };

    expect(mapDocument(raw, DocumentType.COMMERCIAL_INVOICE)).toEqual({
      invoiceNumber: 'INV-1001',
      invoiceValue: '12500.5',
      currency: 'USD',
      exporter: 'Shenzhen Widgets Co',
      importer: 'Acme Importers Ltd',
      hsCode: '8471.30',
      countryOfOrigin: 'CN',
      goodsDescription: 'Laptop computers',
    });
  });

  it('maps a packing list, coercing weights to strings, packages to int, ispm15 to boolean', () => {
    const raw = {
      gross_weight_kg: 1040.25,
      net_weight_kg: 980,
      number_of_packages: '12',
      packaging_type: 'Wood',
      ispm15: 'yes',
    };

    expect(mapDocument(raw, DocumentType.PACKING_LIST)).toEqual({
      grossWeightKg: '1040.25',
      netWeightKg: '980',
      numberOfPackages: 12,
      packagingType: 'Wood',
      ispm15Certified: true,
    });
  });

  it('maps a bill of lading, using document type to resolve a bare "number" field', () => {
    const raw = {
      number: 'BL-88231',
      container: 'MSKU1234565',
      mode: 'SEA',
    };

    expect(mapDocument(raw, DocumentType.BILL_OF_LADING)).toEqual({
      billOfLadingNumber: 'BL-88231',
      containerNumber: 'MSKU1234565',
      freightMode: 'SEA',
    });
  });

  it('accepts already-canonical camelCase keys', () => {
    const raw = { hsCode: '8471.30', invoiceValue: '99.00' };
    expect(mapDocument(raw, DocumentType.OTHER)).toEqual({
      hsCode: '8471.30',
      invoiceValue: '99.00',
    });
  });

  it('omits fields that are absent or empty rather than emitting undefined/null', () => {
    const raw = { invoice_number: '', hs_code: '   ', currency: 'EUR' };
    const result = mapDocument(raw, DocumentType.COMMERCIAL_INVOICE);
    expect(result).toEqual({ currency: 'EUR' });
    expect(Object.prototype.hasOwnProperty.call(result, 'invoiceNumber')).toBe(
      false,
    );
  });
});
