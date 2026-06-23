import { Supplier, Prisma } from "@prisma/client";
import { prisma } from "../../config/database";

export class SupplierRepository {
  /**
   * Create a new supplier
   */
  async create(data: Prisma.SupplierCreateInput): Promise<Supplier> {
    return prisma.supplier.create({ data });
  }

  /**
   * Find supplier by ID
   */
  async findById(id: string): Promise<Supplier | null> {
    return prisma.supplier.findUnique({ where: { id } });
  }

  /**
   * Find supplier by registration number
   */
  async findByRegistrationNumber(registrationNumber: string): Promise<Supplier | null> {
    return prisma.supplier.findUnique({ where: { registrationNumber } });
  }

  /**
   * Update supplier by ID
   */
  async update(id: string, data: Prisma.SupplierUpdateInput): Promise<Supplier> {
    return prisma.supplier.update({ where: { id }, data });
  }

  /**
   * Delete supplier (soft delete)
   */
  async delete(id: string): Promise<Supplier> {
    return prisma.supplier.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * Find many suppliers with filters
   */
  async findMany(where?: Prisma.SupplierWhereInput, skip?: number, take?: number) {
    return prisma.supplier.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Count suppliers with filters
   */
  async count(where?: Prisma.SupplierWhereInput): Promise<number> {
    return prisma.supplier.count({ where });
  }

  /**
   * Find active suppliers
   */
  async findActive() {
    return prisma.supplier.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });
  }

  /**
   * Bulk update suppliers
   */
  async bulkUpdate(ids: string[], data: Prisma.SupplierUpdateInput) {
    return prisma.supplier.updateMany({
      where: { id: { in: ids } },
      data,
    });
  }

  /**
   * Check if registration number exists (excluding a specific ID)
   */
  async registrationNumberExists(registrationNumber: string, excludeId?: string): Promise<boolean> {
    const where: Prisma.SupplierWhereInput = { registrationNumber };
    if (excludeId) {
      where.id = { not: excludeId };
    }
    const supplier = await prisma.supplier.findFirst({ where });
    return !!supplier;
  }
}

export const supplierRepository = new SupplierRepository();
