import { Response, NextFunction } from 'express';
import { pricingService } from './pricing.service';
import { successResponse } from '../../utils/response';
import { AuthRequest } from '../../middleware/auth.middleware';

export const pricingController = {
  // GET /api/pricing/customer/:customerId/compare
  async getComparisonList(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { customerId } = req.params;
      const result = await pricingService.getCustomerPriceComparisonList(customerId);
      res.json(successResponse('Customer pricing comparison list retrieved', result));
    } catch (err) { next(err); }
  },

  // POST /api/pricing/override
  async overridePrice(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { customerId, productId, newBasePrice, newCostPrice, reason } = req.body;
      const result = await pricingService.overridePrice(
        customerId, 
        productId, 
        req.user!.id, 
        newBasePrice !== undefined ? parseFloat(newBasePrice) : undefined, 
        newCostPrice !== undefined ? parseFloat(newCostPrice) : undefined, 
        reason
      );
      res.json(successResponse('Price overridden successfully', result));
    } catch (err) { next(err); }
  }
};