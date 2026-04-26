import { prisma } from '../../config/database';
import { ConflictError, NotFoundError, ValidationError } from '../../utils/errors';
import { logger } from '../../utils/logger';

export const productService = {
  async createProduct(input: any) {
    if (!input.sku || !input.name) throw new ValidationError('SKU and name required');
    const existing = await prisma.product.findUnique({ where: { sku: input.sku } });
    if (existing) throw new ConflictError('SKU exists');
    const category = await prisma.category.findUnique({ where: { id: input.categoryId } });
    if (!category) throw new NotFoundError('Category not found');
    const uom = await prisma.unitOfMeasure.findUnique({ where: { id: input.unitOfMeasureId } });
    if (!uom) throw new NotFoundError('UnitOfMeasure not found');

    const product = await prisma.product.create({ data: input });
    logger.info('Product created', { productId: product.id });
    return product;
  },

  async getProduct(id: string) {
    const p = await prisma.product.findUnique({ where: { id }, include: { category: true, unitOfMeasure: true, supplier: true, inventories: { include: { warehouse: true } } } });
    if (!p) throw new NotFoundError('Product not found');
    return p;
  },

  async listProducts(page = 1, limit = 20, filters?: any) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (filters?.search) where.OR = [{ name: { contains: filters.search, mode: 'insensitive' } }, { sku: { contains: filters.search, mode: 'insensitive' } }];
    if (filters?.categoryId) where.categoryId = filters.categoryId;
    if (filters?.isActive !== undefined) where.isActive = filters.isActive;
    const [data, total] = await Promise.all([prisma.product.findMany({ where, include: { category: true, unitOfMeasure: true, supplier: true }, skip, take: limit, orderBy: { createdAt: 'desc' } }), prisma.product.count({ where })]);
    return { data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  },

  async updateProduct(id: string, input: any) {
    const prod = await prisma.product.findUnique({ where: { id } });
    if (!prod) throw new NotFoundError('Product not found');
    const updated = await prisma.product.update({ where: { id }, data: input });
    logger.info('Product updated', { productId: id });
    return updated;
  },
};