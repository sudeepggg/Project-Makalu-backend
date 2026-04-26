import { Response, NextFunction } from 'express';
import { paymentService } from './payment.service';
import { successResponse } from '../../utils/response';
import { AuthRequest } from '../../middleware/auth.middleware';

export const paymentController = {
  async record(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const r = await paymentService.recordPayment(req.body);
      res.status(201).json(successResponse('Payment recorded', r));
    } catch (err) { next(err); }
  },

  async get(req: any, res: Response, next: NextFunction) {
    try { const r = await paymentService.getPayment(req.params.id); res.json(successResponse('Payment', r)); } catch (err) { next(err); }
  },

  async list(req: any, res: Response, next: NextFunction) {
    try { const r = await paymentService.listPayments(parseInt(req.query.page) || 1, parseInt(req.query.limit) || 20, req.query); res.json(successResponse('Payments', r)); } catch (err) { next(err); }
  },
};