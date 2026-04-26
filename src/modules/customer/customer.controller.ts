import { Response, NextFunction } from 'express';
import { customerService } from './customer.service';
import { successResponse } from '../../utils/response';
import { AuthRequest } from '../../middleware/auth.middleware';

export const customerController = {
  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await customerService.createCustomer(req.body);
      res.status(201).json(successResponse('Customer created', result));
    } catch (err) { next(err); }
  },

  async list(req: any, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const result = await customerService.listCustomers(page, limit, req.query);
      res.json(successResponse('Customers', result));
    } catch (err) { next(err); }
  },

  async get(req: any, res: Response, next: NextFunction) {
    try {
      const result = await customerService.getCustomer(req.params.id);
      res.json(successResponse('Customer', result));
    } catch (err) { next(err); }
  },

  async update(req: any, res: Response, next: NextFunction) {
    try {
      const result = await customerService.updateCustomer(req.params.id, req.body);
      res.json(successResponse('Customer updated', result));
    } catch (err) { next(err); }
  },

  async toggleActive(req: any, res: Response, next: NextFunction) {
    try {
      const result = await customerService.toggleActive(req.params.id);
      res.json(successResponse('Customer toggled', result));
    } catch (err) { next(err); }
  },
};