import { Router } from 'express';
import { pricingController } from './pricing.controller';
import { authMiddleware, requireRole } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validation.middleware';
import { calculatePriceSchema, setCustomerPriceSchema, overridePriceSchema, createPriceListSchema } from './pricing.validation';

export const pricingRoutes = Router();

pricingRoutes.use(authMiddleware);

pricingRoutes.get('/calculate', validateRequest(calculatePriceSchema), pricingController.calculatePrice);
pricingRoutes.post('/customer-price', requireRole('ADMIN'), validateRequest(setCustomerPriceSchema), pricingController.setCustomerPrice);
pricingRoutes.post('/override', requireRole('ADMIN'), validateRequest(overridePriceSchema), pricingController.overridePrice);
pricingRoutes.post('/price-list', requireRole('ADMIN'), validateRequest(createPriceListSchema), pricingController.createPriceList);
pricingRoutes.get('/price-lists', pricingController.getActivePriceLists);
pricingRoutes.get('/history', pricingController.getPricingHistory);