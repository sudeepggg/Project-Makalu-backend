import { Router } from 'express';
import { pricingController } from './pricing.controller';
import { authMiddleware, requireRole } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validation.middleware';
import { overridePriceSchema } from './pricing.validation';

export const pricingRoutes = Router();

// Secure all pricing routes by default
pricingRoutes.use(authMiddleware);

// Get the focused comparison list for a specific customer
pricingRoutes.get(
  '/customer/:customerId/compare', 
  pricingController.getComparisonList
);

// Submit or update a base/cost override for a customer
pricingRoutes.post(
  '/override', 
  requireRole('ADMIN'), 
  validateRequest(overridePriceSchema), 
  pricingController.overridePrice
);