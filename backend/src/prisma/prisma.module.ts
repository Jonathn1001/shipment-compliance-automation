import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Global Prisma module — a single PrismaService instance is shared across all
 * feature modules (repositories inject it). Global so feature modules don't each
 * re-import it.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
