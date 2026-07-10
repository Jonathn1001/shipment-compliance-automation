import { Injectable } from '@nestjs/common';
import { AuditAction, Prisma, Shipment } from '../../generated/prisma/client';
import { AppException } from '../common/app.exception';
import { ErrorCode } from '../common/error-code';
import { AuditService } from '../audit/audit.service';
import { PageOpts } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { toJsonInput } from '../prisma/prisma-json';
import { ShipmentRepository } from '../shipment/shipment.repository';
import { CanonicalFields, CanonicalKey } from './canonical';
import { CANONICAL_KEYS, FIELD_KIND } from './canonical-fields';
import { DocumentRepository } from './document.repository';
import { IngestDocumentDto } from './dto/ingest-document.dto';
import { mapDocument } from './field-mapper';
import { FieldFill, reconcile } from './reconciler';

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
      throw new AppException(ErrorCode.SHIPMENT_NOT_FOUND);
    }

    const mapped = mapDocument(dto.payload, dto.documentType);
    const { fills, conflicts } = reconcile(toCanonical(shipment), mapped);

    return this.prisma.$transaction(async (tx) => {
      const document = await this.documents.create(
        {
          shipmentId,
          documentType: dto.documentType,
          sourceType: dto.sourceType,
          rawInput: toJsonInput(dto.payload),
          mappedFields: toJsonInput(mapped),
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
        toJsonInput({
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
          toJsonInput({
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

  listForShipment(shipmentId: string, opts: PageOpts) {
    return this.documents.findByShipment(shipmentId, opts);
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

/**
 * Project a persisted shipment into the plain canonical shape the reconciler
 * expects — driven by {@link FIELD_KIND} so a new field needs no edit here:
 * decimals become strings (precision preserved), dates ISO strings, the rest
 * pass through; null/undefined columns are dropped.
 */
function toCanonical(s: Shipment): CanonicalFields {
  const row = s as unknown as Record<CanonicalKey, unknown>;
  const out: CanonicalFields = {};
  for (const key of CANONICAL_KEYS) {
    const value = row[key];
    if (value === null || value === undefined) continue;
    (out[key] as unknown) =
      FIELD_KIND[key] === 'decimal'
        ? (value as Prisma.Decimal).toString()
        : FIELD_KIND[key] === 'date'
          ? (value as Date).toISOString()
          : value;
  }
  return out;
}

/**
 * Turn reconciler fills into a Prisma update. Date-kind fields are carried as ISO
 * strings in the canonical shape and coerced back to `Date` for the column.
 */
function fillsToUpdate(fills: FieldFill[]): Prisma.ShipmentUpdateInput {
  const update: Record<string, unknown> = {};
  for (const fill of fills) {
    update[fill.field] =
      FIELD_KIND[fill.field] === 'date'
        ? new Date(fill.newValue as string)
        : fill.newValue;
  }
  return update;
}
