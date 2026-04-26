import { z } from 'zod';

export const calculatePriceSchema = z.object({
  query: z.object({
    customerId: z.string().uuid(),
    productId: z.string().uuid(),
    quantity: z.string().optional(),
  }),
});

export const setCustomerPriceSchema = z.object({
  body: z.object({
    customerId: z.string().uuid(),
    productId: z.string().uuid(),
    price: z.number().min(0),
    discountPercentage: z.number().min(0).max(100).optional(),
    expiryDate: z.string().optional(),
  }),
});

export const overridePriceSchema = z.object({
  body: z.object({
    customerId: z.string().uuid(),
    productId: z.string().uuid(),
    newPrice: z.number().min(0),
    reason: z.string().optional(),
  }),
});

export const createPriceListSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    effectiveDate: z.string().optional(),
    expiryDate: z.string().optional(),
    priority: z.number().int().optional().default(0),
    items: z.array(z.object({ productId: z.string().uuid(), price: z.number().min(0), discountPercentage: z.number().min(0).max(100).optional() })).min(1),
  }),
});