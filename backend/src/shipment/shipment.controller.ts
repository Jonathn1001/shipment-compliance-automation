import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { ShipmentService } from './shipment.service';

/**
 * Shipment HTTP surface. Controllers stay thin: validate input (DTO + global
 * ValidationPipe), delegate to the service, and let the response interceptor /
 * exception filter apply the `{ data } | { error }` envelope. `x-actor` lets a
 * human actor be recorded in the audit trail (defaults to "system").
 */
@ApiTags('Shipments')
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

  @Post(':id/approve')
  approve(@Param('id') id: string, @Headers('x-actor') actor?: string) {
    return this.shipmentService.approve(id, actor);
  }
}
