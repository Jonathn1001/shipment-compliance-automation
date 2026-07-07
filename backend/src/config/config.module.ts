import { Global, Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { AppConfigService } from './app-config.service';
import { validate } from './env.validation';

/**
 * Global configuration module. Wraps Nest's ConfigModule (env validated at
 * bootstrap via {@link validate}) and exposes the typed {@link AppConfigService}
 * as the single configuration source for the whole app.
 */
@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      validate,
    }),
  ],
  providers: [AppConfigService],
  exports: [AppConfigService],
})
export class AppConfigModule {}
