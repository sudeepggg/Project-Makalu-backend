import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import { successResponse } from '../../utils/response';

export const authController = {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.register(req.body);
      res.status(201).json(successResponse('Registered', result));
    } catch (err) {
      next(err);
    }
  },

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.login(req.body);
      res.json(successResponse('Authenticated', result));
    } catch (err) {
      next(err);
    }
  },

  async profile(req: any, res: Response, next: NextFunction) {
    try {
      const user = await authService.getProfile(req.user.id);
      res.json(successResponse('Profile', user));
    } catch (err) {
      next(err);
    }
  },

  async changePassword(req: any, res: Response, next: NextFunction) {
    try {
      await authService.changePassword(req.user.id, req.body.oldPassword, req.body.newPassword);
      res.json(successResponse('Password changed'));
    } catch (err) {
      next(err);
    }
  },
};