import { Router } from 'express';
import { productController } from './product.controller';
import { authMiddleware, requireRole } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validation.middleware';
import { createProductSchema, updateProductSchema } from './product.validation';

export const productRoutes = Router();

productRoutes.use(authMiddleware);

productRoutes.post('/', requireRole('ADMIN'), validateRequest(createProductSchema), productController.create);
productRoutes.get('/', productController.list);
productRoutes.get('/:id', productController.get);
productRoutes.put('/:id', requireRole('ADMIN'), validateRequest(updateProductSchema), productController.update);