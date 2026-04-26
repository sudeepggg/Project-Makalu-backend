import { Router } from 'express';
import { reportController } from './report.controller';
import { authMiddleware } from '../../middleware/auth.middleware';

export const reportRoutes = Router();

reportRoutes.use(authMiddleware);

reportRoutes.get('/sales', reportController.sales);
reportRoutes.get('/inventory', reportController.inventory);
reportRoutes.get('/kpis', reportController.kpis);