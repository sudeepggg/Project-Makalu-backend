import { z } from 'zod';

export const createCustomerSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100),
    customerTypeId: z.string().uuid(),
    registrationNumber: z.string().max(50).optional(),
    contactPerson: z.string().max(100).optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    website: z.string().optional(),
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
    country: z.string().optional(),
    creditLimit: z.number().min(0).optional().default(0),
  }),
});

export const updateCustomerSchema = z.object({ body: createCustomerSchema.shape.body.partial() });