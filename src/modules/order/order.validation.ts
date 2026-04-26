import { z } from 'zod';

export const createOrderSchema = z.object({
  body: z.object({
    customerId: z.string().uuid(),
    items: z.array(z.object({ productId: z.string().uuid(), quantity: z.number().int().min(1), discountPercentage: z.number().min(0).max(100).optional() })).min(1),
    notes: z.string().optional(),
    expectedDeliveryDate: z.string().optional(),
  }),
});