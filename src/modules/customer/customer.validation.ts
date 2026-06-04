import { z } from "zod";

const phoneRegex = /^\+?[0-9\s\-().]{7,20}$/;

export const createCustomerSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100),
    customerTypeId: z.string().uuid(),
    registrationNumber: z.string().max(50).optional(),
    contactPerson: z.string().max(100).optional(),
    email: z.string().email().optional(),
    phone: z
      .string()
      .regex(phoneRegex, "Invalid phone number")
      .optional(),
    alternatePhone: z
      .string()
      .regex(phoneRegex, "Invalid alternate phone number")
      .optional().nullable(),
    website: z.string().url("Invalid URL").optional(),
    street: z.string().max(150).optional(),
    city: z.string().max(100).optional(),
    state: z.string().max(100).optional(),
    zipCode: z
      .string()
      .regex(/^[A-Z0-9\s\-]{3,10}$/i, "Invalid zip code")
      .optional(),
    country: z.string().max(100).optional(),
    creditLimit: z.number().min(0).default(0),
  }),
});

export const updateCustomerSchema = z.object({
  body: createCustomerSchema.shape.body.partial(),
});