import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from './prisma.service';

/**
 * A Prisma client that can run the write methods — either the root
 * PrismaService or a `$transaction` interactive client. Repositories accept this
 * so the same intent method works standalone or composed inside a transaction.
 */
export type PrismaTx = PrismaService | Prisma.TransactionClient;
