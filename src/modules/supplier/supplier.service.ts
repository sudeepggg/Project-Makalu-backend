import { Prisma } from "@prisma/client";
import { CreateSupplierInput, ListSupplierQuery, UpdateSupplierInput } from "./supplier.validation";
import { supplierRepository } from "./supplier.repository";

export class SupplierService {
  /**
   * Create a new supplier
   */
  async createSupplier(data: CreateSupplierInput) {
    try {
      // Check if registration number already exists
      if (data.registrationNumber) {
        const exists = await supplierRepository.registrationNumberExists(data.registrationNumber);
        if (exists) {
          throw new Error("Registration number already exists");
        }
      }

      const supplier = await supplierRepository.create(data);
      return supplier;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
          throw new Error("Supplier with this registration number already exists");
        }
      }
      throw error;
    }
  }

  /**
   * Get supplier by ID
   */
  async getSupplierById(id: string) {
    const supplier = await supplierRepository.findById(id);

    if (!supplier) {
      throw new Error("Supplier not found");
    }

    return supplier;
  }

  /**
   * Update supplier by ID
   */
  async updateSupplier(id: string, data: UpdateSupplierInput) {
    try {
      // Check if supplier exists
      const supplier = await supplierRepository.findById(id);
      if (!supplier) {
        throw new Error("Supplier not found");
      }

      // Check if registration number is being updated and already exists
      if (data.registrationNumber && data.registrationNumber !== supplier.registrationNumber) {
        const exists = await supplierRepository.registrationNumberExists(data.registrationNumber, id);
        if (exists) {
          throw new Error("Registration number already exists");
        }
      }

      const updated = await supplierRepository.update(id, data);
      return updated;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          throw new Error("Supplier not found");
        }
        if (error.code === "P2002") {
          throw new Error("Supplier with this registration number already exists");
        }
      }
      throw error;
    }
  }

  /**
   * Delete supplier by ID (soft delete)
   */
  async deleteSupplier(id: string) {
    try {
      const supplier = await supplierRepository.findById(id);
      if (!supplier) {
        throw new Error("Supplier not found");
      }

      const deleted = await supplierRepository.delete(id);
      return deleted;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          throw new Error("Supplier not found");
        }
      }
      throw error;
    }
  }

  /**
   * List suppliers with pagination and filtering
   */
  async listSuppliers(query: ListSupplierQuery) {
    const { page = 1, limit = 20, search, isActive } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.SupplierWhereInput = {};

    // Filter by active status
    if (isActive !== undefined) {
      where.isActive = isActive === "true";
    }

    // Search by name, email, or registration number
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { registrationNumber: { contains: search, mode: "insensitive" } },
      ];
    }

    // Get total count
    const total = await supplierRepository.count(where);

    // Get paginated results
    const data = await supplierRepository.findMany(where, skip, limit);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get active suppliers only
   */
  async getActiveSuppliers() {
    return supplierRepository.findActive();
  }

  /**
   * Bulk update suppliers
   */
  async bulkUpdateSuppliers(ids: string[], data: Partial<UpdateSupplierInput>) {
    return supplierRepository.bulkUpdate(ids, data);
  }

  /**
   * Check if registration number already exists
   */
  async checkRegistrationNumberExists(registrationNumber: string, excludeId?: string) {
    return supplierRepository.registrationNumberExists(registrationNumber, excludeId);
  }
}

export const supplierService = new SupplierService();
