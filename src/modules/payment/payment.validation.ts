import { z } from 'zod';

export const recordPaymentSchema = z.object({
  body: z.object({
    orderId: z.string().uuid(),
    customerId: z.string().uuid(),
    amount: z.number().min(0.01),
    paymentMethod: z.string().min(1),
    transactionId: z.string().optional(),
    notes: z.string().optional(),
  }),
});