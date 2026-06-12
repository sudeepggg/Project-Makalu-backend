import { Router } from 'express';
import { pricingController } from './pricing.controller';
import { authMiddleware, requireRole } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validation.middleware';
import { overridePriceSchema } from './pricing.validation';

export const pricingRoutes = Router();

pricingRoutes.use(authMiddleware);
pricingRoutes.get('/customer/:customerId/compare', pricingController.getComparisonList);
pricingRoutes.get('/customer/:customerId/history', pricingController.getOverrideHistory);
pricingRoutes.post(
  '/override',
  requireRole('ADMIN'),
  validateRequest(overridePriceSchema),
  pricingController.overridePrice,
);