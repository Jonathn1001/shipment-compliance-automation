import {
  IsBoolean,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

/**
 * Create a shipment. Only `shipmentReference` is required — every other
 * canonical field is optional so a shipment can start partial and be hydrated
 * later from ingested documents (validation rules flag fields still missing at
 * readiness time).
 */
export class CreateShipmentDto {
  @IsString()
  @IsNotEmpty()
  shipmentReference!: string;

  @IsOptional() @IsString() exporter?: string;
  @IsOptional() @IsString() importer?: string;
  @IsOptional() @IsString() importerId?: string;
  @IsOptional() @IsString() invoiceNumber?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  invoiceValue?: number;
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @IsString() goodsDescription?: string;
  @IsOptional() @IsString() hsCode?: string;
  @IsOptional() @IsString() countryOfOrigin?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  grossWeightKg?: number;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 3 }) @Min(0) netWeightKg?: number;
  @IsOptional() @IsInt() @Min(0) numberOfPackages?: number;

  @IsOptional() @IsString() containerNumber?: string;
  @IsOptional() @IsString() billOfLadingNumber?: string;
  @IsOptional() @IsString() packagingType?: string;
  @IsOptional() @IsBoolean() ispm15Certified?: boolean;
  @IsOptional() @IsString() eformCertificate?: string;
  @IsOptional() @IsString() freightMode?: string;

  @IsOptional() @IsISO8601() arrivalDate?: string;
}
