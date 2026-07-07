import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AppConfigService } from './config/app-config.service';
import { MyLogger } from './logger/my.logger';

/**
 * Bootstrap. Global validation, the response envelope and the exception filter
 * are registered inside AppModule (so tests share them); here we only wire the
 * winston logger and start listening on the configured port.
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: new MyLogger() });
  const config = app.get(AppConfigService);
  await app.listen(config.port);
}

void bootstrap();
