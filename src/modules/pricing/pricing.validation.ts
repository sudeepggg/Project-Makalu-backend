import { z } from 'zod';

export const overridePriceSchema = z.object({
  body: z.object({
    customerId: z.string().uuid(),
    productId: z.string().uuid(),
    newBasePrice: z.number().min(0).optional(),
    newCostPrice: z.number().min(0).optional(),
    reason: z.string().optional(),
  }).refine(data => data.newBasePrice !== undefined || data.newCostPrice !== undefined, {
    message: "You must provide at least a newBasePrice or a newCostPrice to override.",
    path: ["newBasePrice"],
  }),
});