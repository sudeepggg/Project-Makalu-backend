import { Response, NextFunction } from 'express';
import { reportService } from './report.service';
import { successResponse } from '../../utils/response';
import { AuthRequest } from '../../middleware/auth.middleware';

export const reportController = {
  async sales(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined;
      const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : undefined;
      const r = await reportService.getSalesReport(dateFrom, dateTo);
      res.json(successResponse('Sales report', r));
    } catch (err) { next(err); }
  },

  async inventory(req: AuthRequest, res: Response, next: NextFunction) {
    try { const r = await reportService.getInventoryReport(); res.json(successResponse('Inventory report', r)); } catch (err) { next(err); }
  },

  async kpis(req: AuthRequest, res: Response, next: NextFunction) {
    try { const r = await reportService.getDashboardKPIs(); res.json(successResponse('KPIs', r)); } catch (err) { next(err); }
  },
};