import { z } from "zod";

// ─── Reusable ────────────────────────────────────────────────────────────────

const uuidField = z.string().uuid();

const orderItemSchema = z.object({
  productId: uuidField,
  quantity: z.number().int().min(1),
  discountPercentage: z.number().min(0).max(100).optional(),
});

const orderItemUpdateSchema = z.object({
  id: uuidField.optional(),
  productId: uuidField,
  quantity: z.number().int().min(1),
  discountPercentage: z.number().min(0).max(100).optional(),
  _delete: z.boolean().optional(),
});

// ─── Create ──────────────────────────────────────────────────────────────────

export const createOrderSchema = z.object({
  body: z.object({
    customerId: uuidField,
    currency: z.string().length(3).default("NPR"),
    expectedDeliveryDate: z
      .string()
      .datetime({ message: "Must be a valid ISO datetime" })
      .optional(),
    notes: z.string().max(1000).optional(),
    items: z.array(orderItemSchema).min(1, {
      message: "Order must have at least one item",
    }),
  }),
});

// ─── Update ──────────────────────────────────────────────────────────────────

export const updateOrderSchema = z.object({
  params: z.object({
    id: uuidField,
  }),
  body: z
    .object({
      customerId: uuidField.optional(),
      currency: z.string().length(3).optional(),
      expectedDeliveryDate: z
        .string()
        .datetime({ message: "Must be a valid ISO datetime" })
        .optional(),
      notes: z.string().max(1000).optional(),
      items: z.array(orderItemUpdateSchema).min(1).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field must be provided for update",
    }),
});

// ─── Confirm / Transition ─────────────────────────────────────────────────────

export const confirmOrderSchema = z.object({
  params: z.object({
    id: uuidField,
  }),
  body: z.object({
    action: z.enum(["confirm", "dispatch", "deliver"], {
      errorMap: () => ({
        message: "Action must be one of: confirm, dispatch, deliver",
      }),
    }),
  }),
});

export const deleteOrderSchema = z.object({
  params: z.object({
    id: uuidField,
  }),
});

// ─── Types ───────────────────────────────────────────────────────────────────

export type CreateOrderInput = z.infer<typeof createOrderSchema>["body"];
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>["body"];
export type ConfirmOrderInput = z.infer<typeof confirmOrderSchema>["body"];
export type DeleteOrderInput = z.infer<typeof deleteOrderSchema>["params"];