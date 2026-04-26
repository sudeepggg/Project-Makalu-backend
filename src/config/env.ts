import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRY: z.string().default('24h'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  MAX_REQUEST_SIZE: z.string().default('10mb'),
});

export const env = envSchema.parse(process.env);