import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export function loggingMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} - ${ms}ms`);
  });
  next();
}