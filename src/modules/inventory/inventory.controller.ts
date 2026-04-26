import { Response, NextFunction } from 'express';
import { inventoryService } from './inventory.service';
import { successResponse } from '../../utils/response';
import { AuthRequest } from '../../middleware/auth.middleware';

export const inventoryController = {
  async receive(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { productId, warehouseId, quantity, referenceId } = req.body;
      const r = await inventoryService.receiveStock(productId, warehouseId, quantity, referenceId);
      res.json(successResponse('Stock received', r));
    } catch (err) { next(err); }
  },

  async adjust(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { productId, warehouseId, currentQuantity, newQuantity, reason } = req.body;
      const r = await inventoryService.adjustStock(productId, warehouseId, currentQuantity, newQuantity, reason);
      res.json(successResponse('Stock adjusted', r));
    } catch (err) { next(err); }
  },

  async list(req: any, res: Response, next: NextFunction) {
    try {
      const r = await inventoryService.listInventory(req.query.warehouseId);
      res.json(successResponse('Inventory list', r));
    } catch (err) { next(err); }
  },

  async movements(req: any, res: Response, next: NextFunction) {
    try {
      const r = await inventoryService.getStockMovements(req.query.productId, req.query.warehouseId, parseInt(req.query.limit) || 100);
      res.json(successResponse('Stock movements', r));
    } catch (err) { next(err); }
  },

  async lowStock(req: any, res: Response, next: NextFunction) {
    try {
      const r = await inventoryService.getLowStockAlerts(req.query.warehouseId);
      res.json(successResponse('Low stock', r));
    } catch (err) { next(err); }
  },
};