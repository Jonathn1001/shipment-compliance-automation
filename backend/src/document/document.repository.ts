import { Injectable } from '@nestjs/common';
import {
  DocumentType,
  Prisma,
  SourceType,
} from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaTx } from '../prisma/prisma-tx';

export interface CreateDocumentInput {
  shipmentId: string;
  documentType: DocumentType;
  sourceType: SourceType;
  rawInput: Prisma.InputJsonValue;
  mappedFields: Prisma.InputJsonValue;
}

/**
 * Intent-based access for ingested documents. `create` accepts an optional
 * transaction client so ingestion (persist document + apply fills + audit) runs
 * atomically.
 */
@Injectable()
export class DocumentRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(input: CreateDocumentInput, client: PrismaTx = this.prisma) {
    return client.documentIngestion.create({ data: input });
  }

  findByShipment(shipmentId: string) {
    return this.prisma.documentIngestion.findMany({
      where: { shipmentId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
