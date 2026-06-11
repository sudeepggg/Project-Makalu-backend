import { z } from 'zod';

export const overridePriceSchema = z.object({
  body: z.object({
    customerId: z.string().uuid(),
    productId: z.string().uuid(),
    basePrice: z.number().min(0).optional(),
    costPrice: z.number().min(0).optional(),
    reason: z.string().optional(),
  }).refine(data => data.basePrice !== undefined || data.costPrice !== undefined, {
    message: "You must provide at least a basePrice or a costPrice to override.",
    path: ["basePrice"]
  }),
});