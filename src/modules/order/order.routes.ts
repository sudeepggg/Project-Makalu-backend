import { Router } from "express";
import { orderController } from "./order.controller";
import { authMiddleware, requireRole } from "../../middleware/auth.middleware";
import { validateRequest } from "../../middleware/validation.middleware";
import { createOrderSchema, deleteOrderSchema, updateOrderSchema } from "./order.validation";

export const orderRoutes = Router();

orderRoutes.use(authMiddleware);

orderRoutes.post(
  "/",
  requireRole("ADMIN", "SALES_STAFF"),
  validateRequest(createOrderSchema),
  orderController.create,
);
orderRoutes.patch(
  "/:id",
  requireRole("ADMIN", "SALES_STAFF"),
  validateRequest(updateOrderSchema),
  orderController.update,
);
orderRoutes.get("/", orderController.list);
orderRoutes.get("/:id", orderController.get);
orderRoutes.post(
  "/:id/confirm",
  requireRole("ADMIN", "SALES_STAFF"),
  orderController.confirm,
);
orderRoutes.post(
  "/:id/dispatch",
  requireRole("ADMIN"),
  orderController.dispatch,
);
orderRoutes.post("/:id/deliver", requireRole("ADMIN"), orderController.deliver);

orderRoutes.delete(
  "/:id",
  requireRole("ADMIN", "SALES_STAFF"),
  validateRequest(deleteOrderSchema),
  orderController.remove, // <-- new
);
