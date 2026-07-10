import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client';
import { AppConfigService } from '../config/app-config.service';

/**
 * Prisma client as a Nest provider. Prisma 7 connects through a driver adapter
 * rather than a schema/datasource URL; the pg adapter is fed the connection
 * string from the typed config (not `process.env` here) so configuration stays
 * centralized and the connection target is explicit and testable.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(config: AppConfigService) {
    super({ adapter: new PrismaPg({ connectionString: config.databaseUrl }) });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
