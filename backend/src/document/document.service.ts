import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, Prisma, Shipment } from '../../generated/prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { ShipmentRepository } from '../shipment/shipment.repository';
import { CanonicalFields } from './canonical';
import { DocumentRepository } from './document.repository';
import { IngestDocumentDto } from './dto/ingest-document.dto';
import { mapDocument } from './field-mapper';
import { FieldFill, reconcile } from './reconciler';

const asJson = (value: unknown): Prisma.InputJsonValue =>
  value as Prisma.InputJsonValue;

@Injectable()
export class DocumentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly documents: DocumentRepository,
    private readonly shipments: ShipmentRepository,
    private readonly audit: AuditService,
  ) {}

  /**
   * Ingest a document into a shipment: map its payload to canonical fields,
   * reconcile against the current record, then — atomically — persist the raw +
   * mapped document, fill only the empty canonical fields (never overwrite),
   * and record DOCUMENT_INGESTED plus a FIELD_UPDATED per filled field.
   * Conflicts are returned (not applied) for the operator to resolve.
   */
  async ingest(shipmentId: string, dto: IngestDocumentDto, actor?: string) {
    const shipment = await this.shipments.findById(shipmentId);
    if (!shipment) {
      throw new NotFoundException(`Shipment ${shipmentId} not found`);
    }

    const mapped = mapDocument(dto.payload, dto.documentType);
    const { fills, conflicts } = reconcile(toCanonical(shipment), mapped);

    return this.prisma.$transaction(async (tx) => {
      const document = await this.documents.create(
        {
          shipmentId,
          documentType: dto.documentType,
          sourceType: dto.sourceType,
          rawInput: asJson(dto.payload),
          mappedFields: asJson(mapped),
        },
        tx,
      );

      let updated = shipment;
      if (fills.length > 0) {
        updated = await this.shipments.update(
          shipmentId,
          fillsToUpdate(fills),
          tx,
        );
      }

      // Audit records a summary only — the raw payload lives in rawInput, not here.
      await this.audit.record(
        AuditAction.DOCUMENT_INGESTED,
        shipmentId,
        actor,
        asJson({
          documentId: document.id,
          documentType: dto.documentType,
          sourceType: dto.sourceType,
          filledFields: fills.map((f) => f.field),
          conflictFields: conflicts.map((c) => c.field),
        }),
        tx,
      );

      for (const fill of fills) {
        await this.audit.record(
          AuditAction.FIELD_UPDATED,
          shipmentId,
          actor,
          asJson({
            field: fill.field,
            oldValue: null,
            newValue: fill.newValue,
          }),
          tx,
        );
      }

      return {
        document,
        shipment: updated,
        reconciliation: { filledFields: fills.map((f) => f.field), conflicts },
      };
    });
  }

  listForShipment(shipmentId: string) {
    return this.documents.findByShipment(shipmentId);
  }

  /**
   * The union of canonical values across a shipment's ingested documents (oldest
   * first, first-non-empty wins). Used by the validation engine to feed the
   * document-vs-shipment mismatch rule.
   */
  async mergedDocumentValues(shipmentId: string): Promise<CanonicalFields> {
    const docs = await this.documents.findByShipment(shipmentId);
    const merged: CanonicalFields = {};
    for (const doc of [...docs].reverse()) {
      const mapped = doc.mappedFields as CanonicalFields;
      for (const [key, value] of Object.entries(mapped)) {
        if (
          value !== null &&
          value !== undefined &&
          merged[key as keyof CanonicalFields] === undefined
        ) {
          (merged[key as keyof CanonicalFields] as unknown) = value;
        }
      }
    }
    return merged;
  }
}

/** Project a persisted shipment into the plain canonical shape the reconciler expects. */
function toCanonical(s: Shipment): CanonicalFields {
  return {
    exporter: s.exporter ?? undefined,
    importer: s.importer ?? undefined,
    importerId: s.importerId ?? undefined,
    invoiceNumber: s.invoiceNumber ?? undefined,
    invoiceValue: s.invoiceValue?.toString(),
    currency: s.currency ?? undefined,
    goodsDescription: s.goodsDescription ?? undefined,
    hsCode: s.hsCode ?? undefined,
    countryOfOrigin: s.countryOfOrigin ?? undefined,
    grossWeightKg: s.grossWeightKg?.toString(),
    netWeightKg: s.netWeightKg?.toString(),
    numberOfPackages: s.numberOfPackages ?? undefined,
    containerNumber: s.containerNumber ?? undefined,
    billOfLadingNumber: s.billOfLadingNumber ?? undefined,
    packagingType: s.packagingType ?? undefined,
    ispm15Certified: s.ispm15Certified ?? undefined,
    eformCertificate: s.eformCertificate ?? undefined,
    freightMode: s.freightMode ?? undefined,
    arrivalDate: s.arrivalDate?.toISOString(),
  };
}

/** Turn reconciler fills into a Prisma update (arrivalDate coerced back to Date). */
function fillsToUpdate(fills: FieldFill[]): Prisma.ShipmentUpdateInput {
  const update: Record<string, unknown> = {};
  for (const fill of fills) {
    update[fill.field] =
      fill.field === 'arrivalDate'
        ? new Date(fill.newValue as string)
        : fill.newValue;
  }
  return update;
}
