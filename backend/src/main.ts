import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AppConfigService } from './config/app-config.service';
import { MyLogger } from './logger/my.logger';

/**
 * Bootstrap. Global validation, the response envelope and the exception filter
 * are registered inside AppModule (so tests share them); here we wire the
 * winston logger, publish the OpenAPI docs at `/api/docs`, and start listening.
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: new MyLogger() });

  // Interactive OpenAPI docs. Every response is wrapped in the `{ data } | { error }`
  // envelope by the global interceptor/filter — the schemas here describe the inner
  // `data` payloads. `x-actor` is the optional audit-trail actor header.
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

  const config = app.get(AppConfigService);
  await app.listen(config.port);
}

void bootstrap();
