import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';

export interface AuthRequest extends Request {
  user?: { id: string; username?: string; email?: string; roles: string[] };
}

export function authMiddleware(req: AuthRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(new UnauthorizedError('No token provided'));
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as any;
    req.user = { id: payload.id, username: payload.username, email: payload.email, roles: payload.roles || [] };
    next();
  } catch (err) {
    next(new UnauthorizedError('Invalid or expired token'));
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new UnauthorizedError());
    const has = req.user.roles.some(r => roles.includes(r));
    if (!has) return next(new ForbiddenError('Insufficient permissions'));
    next();
  };
}