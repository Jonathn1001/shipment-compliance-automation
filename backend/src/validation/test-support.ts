import {
  Prisma,
  Shipment,
  ShipmentStatus,
} from '../../generated/prisma/client';
import { ValidationContext } from './validation.types';

/** Build a Shipment fixture for rule unit tests (all fields overridable). */
export function makeShipment(over: Partial<Shipment> = {}): Shipment {
  const now = new Date('2026-07-07T00:00:00.000Z');
  return {
    id: 'ship-1',
    shipmentReference: 'SAF-TEST-1',
    exporter: null,
    importer: null,
    importerId: null,
    invoiceNumber: null,
    invoiceValue: null,
    currency: null,
    goodsDescription: null,
    hsCode: null,
    countryOfOrigin: null,
    grossWeightKg: null,
    netWeightKg: null,
    numberOfPackages: null,
    containerNumber: null,
    billOfLadingNumber: null,
    packagingType: null,
    ispm15Certified: null,
    eformCertificate: null,
    freightMode: null,
    arrivalDate: null,
    currentStatus: ShipmentStatus.CREATED,
    createdAt: now,
    updatedAt: now,
    ...over,
  };
}

/** Wrap a shipment in a ValidationContext with default thresholds. */
export function makeContext(
  over: Partial<ValidationContext> = {},
): ValidationContext {
  return {
    shipment: over.shipment ?? makeShipment(),
    otherShipmentsWithSameReference: over.otherShipmentsWithSameReference ?? 0,
    thresholds: over.thresholds ?? {
      reviewWindowDays: 30,
      weightTolerancePct: 5,
    },
    now: over.now ?? new Date('2026-07-07T00:00:00.000Z'),
  };
}

/** Decimal helper for weight/money fixtures. */
export const dec = (value: string | number): Prisma.Decimal =>
  new Prisma.Decimal(value);
