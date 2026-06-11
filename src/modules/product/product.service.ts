import { STOCK_MOVEMENT_TYPES } from "../../config/constants";
import { prisma } from "../../config/database";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "../../utils/errors";
import { logger } from "../../utils/logger";

export const productService = {
  async createProduct(input: any) {
    // Validate required fields
    if (!input.sku || !input.name)
      throw new ValidationError("SKU and name required");

    // Check duplicate SKU
    const existing = await prisma.product.findUnique({
      where: { sku: input.sku },
    });
    if (existing) throw new ConflictError("SKU already exists");

    // Validate category
    const category = await prisma.category.findUnique({
      where: { id: input.categoryId },
    });
    if (!category) throw new NotFoundError("Category not found");

    // Validate unit of measure
    const uom = await prisma.unitOfMeasure.findUnique({
      where: { id: input.unitOfMeasureId },
    });
    if (!uom) throw new NotFoundError("Unit of measure not found");

    return prisma.$transaction(async (tx) => {
      // Only pass safe fields — never spread raw input into Prisma
      const product = await tx.product.create({
        data: {
          sku: input.sku,
          name: input.name,
          description: input.description,
          imageUrl: input.imageUrl,
          categoryId: input.categoryId,
          unitOfMeasureId: input.unitOfMeasureId,
          supplierId: input.supplierId,
          costPrice: input.costPrice ?? 0,
          basePrice: input.basePrice ?? 0,
          reorderLevel: input.reorderLevel ?? 0,
          reorderQuantity: input.reorderQuantity ?? 0,
          openingStock: input.openingStock ?? 0,
          isActive: true,
        },
      });

      //  Option B — auto-create inventory row at 0
      const warehouse = await tx.warehouse.findFirst({
        where: { isActive: true },
      });

      if (warehouse) {
        await tx.inventory.create({
          data: {
            productId: product.id,
            warehouseId: warehouse.id,
            quantityOnHand: input.openingStock ?? 0,
            quantityAvailable: input.openingStock ?? 0,
            quantityReserved: 0,
          },
        });
        logger.info("Inventory row auto-created", { productId: product.id });
      }

      logger.info("Product created", { productId: product.id });
      return product;
    });
  },

  async getProduct(id: string) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        unitOfMeasure: true,
        supplier: true,
        inventories: { include: { warehouse: true } },
      },
    });
    if (!product) throw new NotFoundError("Product not found");
    return product;
  },

  async listProducts(page = 1, limit = 20, filters?: any) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { sku: { contains: filters.search, mode: "insensitive" } },
      ];
    }
    if (filters?.categoryId) where.categoryId = filters.categoryId;

    //  query string comes as "true"/"false" string — parse to boolean
    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive === "true" || filters.isActive === true;
    }

    const [data, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { category: true, unitOfMeasure: true, supplier: true },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.product.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  },

  async updateProduct(id: string, input: any) {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundError("Product not found");

    //  Only allow safe fields to be updated — never spread raw input
    const updated = await prisma.product.update({
      where: { id },
      data: {
        ...(input.imageUrl && { imageUrl: input.imageUrl }),
        ...(input.name && { name: input.name }),
        ...(input.description && { description: input.description }),
        ...(input.categoryId && { categoryId: input.categoryId }),
        ...(input.unitOfMeasureId && {
          unitOfMeasureId: input.unitOfMeasureId,
        }),
        ...(input.supplierId && { supplierId: input.supplierId }),
        ...(input.costPrice !== undefined && { costPrice: input.costPrice }),
        ...(input.reorderLevel !== undefined && {
          reorderLevel: input.reorderLevel,
        }),
        updatedAt: new Date(),
      },
    });

    logger.info("Product updated", { productId: id });
    return updated;
  },

  //  Added — soft delete
  async deactivateProduct(id: string) {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundError("Product not found");
    if (!product.isActive)
      throw new ValidationError("Product already inactive");

    return prisma.product.update({
      where: { id },
      data: { isActive: false, updatedAt: new Date() },
    });
  },

  //  Added — reactivate
  async reactivateProduct(id: string) {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundError("Product not found");
    if (product.isActive) throw new ValidationError("Product already active");

    return prisma.product.update({
      where: { id },
      data: { isActive: true, updatedAt: new Date() },
    });
  },

  // In productService — add this method
  async addOpeningStock(
    productId: string,
    warehouseId: string,
    quantity: number,
  ) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) throw new NotFoundError("Product not found");
    if (!product.isActive)
      throw new ValidationError("Cannot add stock to inactive product");
    if (quantity <= 0)
      throw new ValidationError("Quantity must be greater than 0");

    return prisma.$transaction(async (tx) => {
      const inventory = await tx.inventory.upsert({
        where: { productId_warehouseId: { productId, warehouseId } },
        create: {
          productId,
          warehouseId,
          quantityOnHand: quantity,
          quantityAvailable: quantity,
          quantityReserved: 0,
          lastStockCheckDate: new Date(),
        },
        update: {
          quantityOnHand: { increment: quantity },
          quantityAvailable: { increment: quantity },
          lastStockCheckDate: new Date(),
        },
      });

      await tx.stockMovement.create({
        data: {
          productId,
          warehouseId,
          movementType: STOCK_MOVEMENT_TYPES.IN,
          quantity,
          referenceType: "OPENING_STOCK",
          notes: "Opening stock entry",
        },
      });

      logger.info("Opening stock added", { productId, warehouseId, quantity });
      return inventory;
    });
  },

  async listUnits() {
    return prisma.unitOfMeasure.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
  },

  async listCategories() {
    return prisma.category.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
  },
};
