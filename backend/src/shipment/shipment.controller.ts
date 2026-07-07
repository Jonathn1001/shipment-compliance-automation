import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { ShipmentService } from './shipment.service';

/**
 * Shipment HTTP surface. Controllers stay thin: validate input (DTO + global
 * ValidationPipe), delegate to the service, and let the response interceptor /
 * exception filter apply the `{ data } | { error }` envelope. `x-actor` lets a
 * human actor be recorded in the audit trail (defaults to "system").
 */
@Controller('shipments')
export class ShipmentController {
  constructor(private readonly shipmentService: ShipmentService) {}

  @Post()
  create(@Body() dto: CreateShipmentDto, @Headers('x-actor') actor?: string) {
    return this.shipmentService.create(dto, actor);
  }

  @Get()
  findAll() {
    return this.shipmentService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.shipmentService.findOne(id);
  }
}
