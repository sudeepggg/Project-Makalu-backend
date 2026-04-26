import { Router } from 'express';
import { paymentController } from './payment.controller';
import { authMiddleware, requireRole } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validation.middleware';
import { recordPaymentSchema } from './payment.validation';

export const paymentRoutes = Router();

paymentRoutes.use(authMiddleware);

paymentRoutes.post('/', requireRole('ADMIN','SALES_STAFF'), validateRequest(recordPaymentSchema), paymentController.record);
paymentRoutes.get('/', paymentController.list);
paymentRoutes.get('/:id', paymentController.get);