import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DocumentService } from './document.service';
import { IngestDocumentDto } from './dto/ingest-document.dto';

/**
 * Document ingestion surface, nested under a shipment. `x-actor` records the
 * human actor in the audit trail (defaults to "system").
 */
@ApiTags('Documents')
@Controller('shipments/:id/documents')
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Post()
  ingest(
    @Param('id') shipmentId: string,
    @Body() dto: IngestDocumentDto,
    @Headers('x-actor') actor?: string,
  ) {
    return this.documentService.ingest(shipmentId, dto, actor);
  }

  @Get()
  list(@Param('id') shipmentId: string) {
    return this.documentService.listForShipment(shipmentId);
  }
}
