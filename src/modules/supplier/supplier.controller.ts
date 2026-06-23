import { Request, Response } from "express";
import { ZodError } from "zod";
import { createSupplierSchema, listSupplierSchema, supplierIdSchema, updateSupplierSchema } from "./supplier.validation";
import { supplierService } from "./supplier.service";

export class SupplierController {
  /**
   * Create a new supplier
   */
  async create(req: Request, res: Response) {
    try {
      const validated = createSupplierSchema.parse({ body: req.body });
      const supplier = await supplierService.createSupplier(validated.body);
      res.status(201).json({
        success: true,
        data: supplier,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: "Validation error",
          details: error.errors,
        });
      } else {
        res.status(400).json({
          success: false,
          error: error instanceof Error ? error.message : "Failed to create supplier",
        });
      }
    }
  }

  /**
   * Get supplier by ID
   */
  async getById(req: Request, res: Response) {
    try {
      const validated = supplierIdSchema.parse({ params: req.params });
      const supplier = await supplierService.getSupplierById(validated.params.id);
      res.json({
        success: true,
        data: supplier,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: "Validation error",
          details: error.errors,
        });
      } else {
        res.status(404).json({
          success: false,
          error: error instanceof Error ? error.message : "Supplier not found",
        });
      }
    }
  }

  /**
   * Update supplier by ID
   */
  async update(req: Request, res: Response) {
    try {
      const validated = updateSupplierSchema.parse({ params: req.params, body: req.body });
      const supplier = await supplierService.updateSupplier(validated.params.id, validated.body);
      res.json({
        success: true,
        data: supplier,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: "Validation error",
          details: error.errors,
        });
      } else {
        res.status(400).json({
          success: false,
          error: error instanceof Error ? error.message : "Failed to update supplier",
        });
      }
    }
  }

  /**
   * Delete supplier by ID
   */
  async delete(req: Request, res: Response) {
    try {
      const validated = supplierIdSchema.parse({ params: req.params });
      const supplier = await supplierService.deleteSupplier(validated.params.id);
      res.json({
        success: true,
        message: "Supplier deleted successfully",
        data: supplier,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: "Validation error",
          details: error.errors,
        });
      } else {
        res.status(404).json({
          success: false,
          error: error instanceof Error ? error.message : "Supplier not found",
        });
      }
    }
  }

  /**
   * List suppliers with pagination and filtering
   */
  async list(req: Request, res: Response) {
    try {
      const validated = listSupplierSchema.parse({ query: req.query });
      const result = await supplierService.listSuppliers(validated.query);
      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: "Validation error",
          details: error.errors,
        });
      } else {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Failed to list suppliers",
        });
      }
    }
  }

  /**
   * Get active suppliers only
   */
  async getActive(req: Request, res: Response) {
    try {
      const suppliers = await supplierService.getActiveSuppliers();
      res.json({
        success: true,
        data: suppliers,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch active suppliers",
      });
    }
  }

  /**
   * Bulk update suppliers
   */
  async bulkUpdate(req: Request, res: Response) {
    try {
      const { ids, data } = req.body;

      if (!Array.isArray(ids) || ids.length === 0) {
        res.status(400).json({
          success: false,
          error: "IDs array is required and must not be empty",
        });
        return;
      }

      const result = await supplierService.bulkUpdateSuppliers(ids, data);
      res.json({
        success: true,
        message: `Updated ${result.count} suppliers`,
        data: result,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to bulk update suppliers",
      });
    }
  }
}

export const supplierController = new SupplierController();
