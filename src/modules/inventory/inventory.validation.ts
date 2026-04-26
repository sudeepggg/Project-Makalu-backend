import { z } from 'zod';

export const receiveStockSchema = z.object({
  body: z.object({
    productId: z.string().uuid(),
    warehouseId: z.string().uuid(),
    quantity: z.number().int().min(1),
    referenceId: z.string().optional(),
  }),
});

export const adjustStockSchema = z.object({
  body: z.object({
    productId: z.string().uuid(),
    warehouseId: z.string().uuid(),
    currentQuantity: z.number().int().min(0),
    newQuantity: z.number().int().min(0),
    reason: z.string().min(1),
  }),
});