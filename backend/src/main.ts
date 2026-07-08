import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { json, urlencoded } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AppConfigService } from './config/app-config.service';
import { MyLogger } from './logger/my.logger';

/** Max request-body size — bounds the ingest payload persisted to jsonb (A04). */
const BODY_LIMIT = '64kb';

/**
 * Bootstrap. Global validation, the response envelope and the exception filter
 * are registered inside AppModule (so tests share them); here we wire the
 * winston logger, security headers (helmet), a request-body size cap, publish the
 * OpenAPI docs (non-production only), and start listening.
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new MyLogger(),
    bodyParser: false,
  });

  // Security headers. CSP is disabled so the Swagger UI (the only HTML surface)
  // keeps working; the API otherwise returns JSON.
  app.use(helmet({ contentSecurityPolicy: false }));

  // Explicit body-size limit (replaces the framework default) so an oversized
  // document payload is rejected before it is parsed or stored.
  app.use(json({ limit: BODY_LIMIT }));
  app.use(urlencoded({ extended: true, limit: BODY_LIMIT }));

  const configService = app.get(AppConfigService);

  // Interactive OpenAPI docs. Every response is wrapped in the `{ data } | { error }`
  // envelope by the global interceptor/filter — the schemas here describe the inner
  // `data` payloads. `x-actor` is the optional audit-trail actor header.
  if (configService.docsEnabled) {
    const openApi = new DocumentBuilder()
      .setTitle('Shipment Compliance Automation')
      .setDescription(
        'Ingest shipment documents, run compliance rules, and derive an ' +
          'auditable readiness decision. Responses use a `{ data } | { error }` envelope.',
      )
      .setVersion('1.0')
      .addGlobalParameters({
        name: 'x-actor',
        in: 'header',
        required: false,
        description:
          'Human actor recorded in the audit trail (defaults to "system").',
        schema: { type: 'string' },
      })
      .build();
    SwaggerModule.setup(
      'api/docs',
      app,
      SwaggerModule.createDocument(app, openApi),
      {
        swaggerOptions: { docExpansion: 'list', tagsSorter: 'alpha' },
      },
    );
  }

  await app.listen(configService.port);
}

void bootstrap();
