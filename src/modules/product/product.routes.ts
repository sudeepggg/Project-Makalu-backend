import { Router } from "express";
import { authMiddleware, requireRole } from "../../middleware/auth.middleware";
import { validateRequest } from "../../middleware/validation.middleware";
import { productController } from "./product.controller";
import { createProductSchema, updateProductSchema } from "./product.validation";
import { upload } from "../../middleware/upload.middleware";

export const productRoutes = Router();

productRoutes.use(authMiddleware);

const parseFormNumbers = (req: any, _res: any, next: any) => {
  if (req.file) req.body.imageUrl = `/uploads/products/${req.file.filename}`;

  [
    "basePrice",
    "costPrice",
    "reorderLevel",
    "reorderQuantity",
    "openingStock",
  ].forEach((k) => {
    if (req.body[k] !== undefined) req.body[k] = Number(req.body[k]);
  });

  next();
};

productRoutes.post(
  "/",
  requireRole("ADMIN"),
  upload.single("imageUrl"),
  parseFormNumbers,
  validateRequest(createProductSchema),
  productController.create,
);
productRoutes.get("/", productController.list);
productRoutes.get("/units", productController.listTypes);
productRoutes.get("/categories", productController.listCategory);
productRoutes.get("/:id", productController.get);
productRoutes.patch("/:id/toggle-active", productController.toggleActive);
productRoutes.put(
  "/:id",
  requireRole("ADMIN"),
  upload.single("imageUrl"),
  parseFormNumbers,
  validateRequest(updateProductSchema),
  productController.update,
);
