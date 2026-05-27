import { Router } from "express";
import { supplierController } from "./supplier.controller";

export const supplierRouter = Router();

supplierRouter.post("/", (req, res) => supplierController.create(req, res));

supplierRouter.get("/", (req, res) => supplierController.list(req, res));

supplierRouter.get("/active", (req, res) => supplierController.getActive(req, res));
supplierRouter.get("/:id", (req, res) => supplierController.getById(req, res));

supplierRouter.patch("/:id", (req, res) => supplierController.update(req, res));
supplierRouter.delete("/:id", (req, res) => supplierController.delete(req, res));

supplierRouter.patch("/bulk/update", (req, res) =>
  supplierController.bulkUpdate(req, res),
);
