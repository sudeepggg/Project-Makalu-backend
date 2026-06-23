import { z } from "zod";

const supplierBody = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  contactPerson: z.string().max(100).optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email().max(100).optional(),
  street: z.string().max(255).optional(),
  city: z.string().max(50).optional(),
  state: z.string().max(50).optional(),
  zipCode: z.string().max(10).optional(),
  country: z.string().max(50).optional(),
  registrationNumber: z.string().max(50).optional(),
  paymentTerms: z.string().max(50).optional(),
});

export const createSupplierSchema = z.object({
  body: supplierBody,
});

export const updateSupplierSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid supplier ID"),
  }),
  body: supplierBody.partial().extend({ isActive: z.boolean().optional() }),
});

export const supplierIdSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid supplier ID"),
  }),
});

export const listSupplierSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().optional(),
    isActive: z.enum(["true", "false"]).optional(),
  }),
});

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>["body"];
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>["body"];
export type ListSupplierQuery = z.infer<typeof listSupplierSchema>["query"];
