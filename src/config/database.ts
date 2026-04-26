import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

export const prisma = new PrismaClient();

prisma.$connect()
  .then(() => logger.info('✅ Database connected successfully'))
  .catch((err) => {
    logger.error('❌ Database connection failed:', err);
    process.exit(1);
  });

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  logger.info('Database disconnected');
  process.exit(0);
});