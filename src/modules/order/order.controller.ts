import { Response, NextFunction } from 'express';
import { orderService } from './order.service';
import { successResponse } from '../../utils/response';
import { AuthRequest } from '../../middleware/auth.middleware';

export const orderController = {
  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const r = await orderService.createOrder(req.user!.id, req.body);
      res.status(201).json(successResponse('Order created', r));
    } catch (err) { next(err); }
  },

  async list(req: any, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const r = await orderService.listOrders(page, limit, req.query);
      res.json(successResponse('Orders', r));
    } catch (err) { next(err); }
  },

  async get(req: any, res: Response, next: NextFunction) {
    try { const r = await orderService.getOrder(req.params.id); res.json(successResponse('Order', r)); } catch (err) { next(err); }
  },

  async confirm(req: any, res: Response, next: NextFunction) {
    try { const r = await orderService.confirmOrder(req.params.id); res.json(successResponse('Order confirmed', r)); } catch (err) { next(err); }
  },

  async dispatch(req: any, res: Response, next: NextFunction) {
    try { const r = await orderService.dispatchOrder(req.params.id); res.json(successResponse('Order dispatched', r)); } catch (err) { next(err); }
  },

  async deliver(req: any, res: Response, next: NextFunction) {
    try { const r = await orderService.deliverOrder(req.params.id); res.json(successResponse('Order delivered', r)); } catch (err) { next(err); }
  },
};