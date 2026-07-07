import { IsDefined, IsEnum, IsObject } from 'class-validator';
import { DocumentType, SourceType } from '../../../generated/prisma/client';

/**
 * Ingestion envelope. `documentType` and `sourceType` must be valid enum values
 * and `payload` must be present — a bad envelope is rejected with 400 by the
 * global ValidationPipe. The payload itself is intentionally freeform (mock
 * document data, no OCR): its inner shape is not validated, only that it exists.
 */
export class IngestDocumentDto {
  @IsEnum(DocumentType)
  documentType!: DocumentType;

  @IsEnum(SourceType)
  sourceType!: SourceType;

  @IsDefined()
  @IsObject()
  payload!: Record<string, unknown>;
}
