import { Response, NextFunction } from 'express';
import { pricingService } from './pricing.service';
import { successResponse } from '../../utils/response';
import { AuthRequest } from '../../middleware/auth.middleware';

export const pricingController = {
  async calculatePrice(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { customerId, productId, quantity } = req.query;
      const result = await pricingService.calculatePrice(customerId as string, productId as string, quantity ? parseInt(quantity as string) : 1);
      res.json(successResponse('Price calculated', result));
    } catch (err) { next(err); }
  },

  async setCustomerPrice(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { customerId, productId, price, discountPercentage, expiryDate } = req.body;
      const result = await pricingService.setCustomerPrice(customerId, productId, price, discountPercentage, expiryDate);
      res.json(successResponse('Customer price set', result));
    } catch (err) { next(err); }
  },

  async overridePrice(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { customerId, productId, newPrice, reason } = req.body;
      const result = await pricingService.overridePrice(customerId, productId, req.user!.id, newPrice, reason);
      res.json(successResponse('Price overridden', result));
    } catch (err) { next(err); }
  },

  async createPriceList(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await pricingService.createPriceList(req.body);
      res.status(201).json(successResponse('Price list created', result));
    } catch (err) { next(err); }
  },

  async getActivePriceLists(_req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await pricingService.getActivePriceLists();
      res.json(successResponse('Active price lists', result));
    } catch (err) { next(err); }
  },

  async getPricingHistory(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { customerId, productId, limit } = req.query;
      const result = await pricingService.getPricingHistory(customerId as string, productId as string, limit ? parseInt(limit as string) : 100);
      res.json(successResponse('Pricing history', result));
    } catch (err) { next(err); }
  },
};