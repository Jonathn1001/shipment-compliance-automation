import { Module, ValidationPipe } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ApiAuthGuard } from './common/api-auth.guard';
import { AllExceptionsFilter } from './common/all-exceptions.filter';
import { ResponseEnvelopeInterceptor } from './common/response-envelope.interceptor';
import { validationExceptionFactory } from './common/validation-exception.factory';
import { AppConfigModule } from './config/config.module';
import { AppConfigService } from './config/app-config.service';
import { DocumentModule } from './document/document.module';
import { PrismaModule } from './prisma/prisma.module';
import { ShipmentModule } from './shipment/shipment.module';
import { ValidationModule } from './validation/validation.module';

/**
 * Root module. Global cross-cutting modules (config, Prisma) plus the shipment
 * feature. The `{ data } | { error }` envelope, input validation and error
 * formatting are registered here as app-wide providers so both the running app
 * and the e2e test module get identical behavior. Later slices add the
 * DocumentIngestion, Validation and Approval modules alongside ShipmentModule.
 */
@Module({
  imports: [
    AppConfigModule,
    // Rate limiting (A04/DoS): per-IP request cap over a sliding window, tunable
    // via THROTTLE_TTL_MS / THROTTLE_LIMIT.
    ThrottlerModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        throttlers: [{ ttl: config.throttleTtlMs, limit: config.throttleLimit }],
      }),
    }),
    PrismaModule,
    ShipmentModule,
    DocumentModule,
    ValidationModule,
  ],
  providers: [
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        // Input-validation failures become 422 + VALIDATION_ERROR with per-field
        // details, instead of the default 400 BadRequestException.
        exceptionFactory: validationExceptionFactory,
      }),
    },
    // Rate-limit first, then authenticate. Both are global; auth is a no-op until
    // API_AUTH_TOKEN is configured.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: ApiAuthGuard },
    { provide: APP_INTERCEPTOR, useClass: ResponseEnvelopeInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
