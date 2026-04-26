import { Router } from 'express';
import { inventoryController } from './inventory.controller';
import { authMiddleware, requireRole } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validation.middleware';
import { receiveStockSchema, adjustStockSchema } from './inventory.validation';

export const inventoryRoutes = Router();

inventoryRoutes.use(authMiddleware);

inventoryRoutes.get('/', inventoryController.list);
inventoryRoutes.get('/movements', inventoryController.movements);
inventoryRoutes.get('/alerts/low-stock', inventoryController.lowStock);

inventoryRoutes.post('/receive', requireRole('ADMIN'), validateRequest(receiveStockSchema), inventoryController.receive);
inventoryRoutes.post('/adjust', requireRole('ADMIN'), validateRequest(adjustStockSchema), inventoryController.adjust);