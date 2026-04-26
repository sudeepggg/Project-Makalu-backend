import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';
import { errorResponse } from '../utils/response';

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  logger.error('Unhandled error', { message: err?.message, stack: err?.stack });
  if (err instanceof AppError) {
    res.status(err.statusCode).json(errorResponse(err.message, err.errorCode));
  } else {
    res.status(500).json(errorResponse('Internal server error', 'INTERNAL_ERROR'));
  }
}