import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../utils/errors';

export function validateRequest(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      req.body = validated.body || req.body;
      req.query = validated.query || req.query;
      req.params = validated.params || req.params;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const message = err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
        next(new ValidationError(message));
      } else {
        next(new ValidationError('Validation failed'));
      }
    }
  };
}