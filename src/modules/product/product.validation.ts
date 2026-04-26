import { z } from 'zod';

export const createProductSchema = z.object({
  body: z.object({
    sku: z.string().min(1).max(50),
    name: z.string().min(1).max(100),
    description: z.string().optional(),
    categoryId: z.string().uuid(),
    unitOfMeasureId: z.string().uuid(),
    supplierId: z.string().uuid().optional(),
    basePrice: z.number().min(0),
    costPrice: z.number().min(0).optional(),
    reorderLevel: z.number().int().min(0).optional(),
    reorderQuantity: z.number().int().min(0).optional(),
  }),
});

export const updateProductSchema = z.object({ body: createProductSchema.shape.body.partial() });