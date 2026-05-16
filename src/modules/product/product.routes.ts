import { Router } from "express";
import { authMiddleware, requireRole } from "../../middleware/auth.middleware";
import { validateRequest } from "../../middleware/validation.middleware";
import { productController } from "./product.controller";
import { createProductSchema, updateProductSchema } from "./product.validation";

export const productRoutes = Router();

productRoutes.use(authMiddleware);

productRoutes.post(
  "/",
  requireRole("ADMIN"),
  validateRequest(createProductSchema),
  productController.create,
);
productRoutes.get("/", productController.list);
productRoutes.get("/units", productController.listTypes);
productRoutes.get("/categories", productController.listCategory);
productRoutes.get("/:id", productController.get);
productRoutes.put(
  "/:id",
  requireRole("ADMIN"),
  validateRequest(updateProductSchema),
  productController.update,
);
