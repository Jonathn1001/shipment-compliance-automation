import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '../../generated/prisma/client';
import { AppConfigService } from '../config/app-config.service';

/**
 * Prisma client as a Nest provider. The datasource URL is taken from the typed
 * config (not read from `process.env` here) so configuration stays centralized
 * and the connection target is explicit and testable.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(config: AppConfigService) {
    super({ datasourceUrl: config.databaseUrl });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
