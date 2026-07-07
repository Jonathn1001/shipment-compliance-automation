import { Module, ValidationPipe } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { AllExceptionsFilter } from './common/all-exceptions.filter';
import { ResponseEnvelopeInterceptor } from './common/response-envelope.interceptor';
import { AppConfigModule } from './config/config.module';
import { PrismaModule } from './prisma/prisma.module';
import { ShipmentModule } from './shipment/shipment.module';

/**
 * Root module. Global cross-cutting modules (config, Prisma) plus the shipment
 * feature. The `{ data } | { error }` envelope, input validation and error
 * formatting are registered here as app-wide providers so both the running app
 * and the e2e test module get identical behavior. Later slices add the
 * DocumentIngestion, Validation and Approval modules alongside ShipmentModule.
 */
@Module({
  imports: [AppConfigModule, PrismaModule, ShipmentModule],
  providers: [
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    },
    { provide: APP_INTERCEPTOR, useClass: ResponseEnvelopeInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
