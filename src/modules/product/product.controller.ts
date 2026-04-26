import { Response, NextFunction } from 'express';
import { productService } from './product.service';
import { successResponse } from '../../utils/response';
import { AuthRequest } from '../../middleware/auth.middleware';

export const productController = {
  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const r = await productService.createProduct(req.body);
      res.status(201).json(successResponse('Product created', r));
    } catch (err) { next(err); }
  },

  async list(req: any, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const r = await productService.listProducts(page, limit, req.query);
      res.json(successResponse('Products', r));
    } catch (err) { next(err); }
  },

  async get(req: any, res: Response, next: NextFunction) {
    try {
      const r = await productService.getProduct(req.params.id);
      res.json(successResponse('Product', r));
    } catch (err) { next(err); }
  },

  async update(req: any, res: Response, next: NextFunction) {
    try {
      const r = await productService.updateProduct(req.params.id, req.body);
      res.json(successResponse('Product updated', r));
    } catch (err) { next(err); }
  },
};