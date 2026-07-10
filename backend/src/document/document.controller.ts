import { Body, Controller, Get, Headers, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { MAX_PAGE_SIZE, pageOpts, PaginationQueryDto } from '../common/pagination';
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
  list(@Param('id') shipmentId: string, @Query() query: PaginationQueryDto) {
    return this.documentService.listForShipment(
      shipmentId,
      pageOpts(query, MAX_PAGE_SIZE),
    );
  }
}
