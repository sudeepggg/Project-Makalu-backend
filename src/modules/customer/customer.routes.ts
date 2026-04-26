import { Router } from 'express';
import { customerController } from './customer.controller';
import { validateRequest } from '../../middleware/validation.middleware';
import { createCustomerSchema, updateCustomerSchema } from './customer.validation';
import { authMiddleware, requireRole } from '../../middleware/auth.middleware';

export const customerRoutes = Router();

customerRoutes.use(authMiddleware);

customerRoutes.post('/', requireRole('ADMIN','SALES_STAFF'), validateRequest(createCustomerSchema), customerController.create);
customerRoutes.get('/', customerController.list);
customerRoutes.get('/:id', customerController.get);
customerRoutes.put('/:id', requireRole('ADMIN','SALES_STAFF'), validateRequest(updateCustomerSchema), customerController.update);
customerRoutes.post('/:id/toggle-active', requireRole('ADMIN'), customerController.toggleActive);