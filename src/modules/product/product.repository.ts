import { prisma } from '../../config/database';

export const productRepository = {
  create(data: any) {
    return prisma.product.create({ data, include: { category: true, unitOfMeasure: true, supplier: true } });
  },
  findById(id: string) {
    return prisma.product.findUnique({ where: { id }, include: { category: true, unitOfMeasure: true, supplier: true, inventories: { include: { warehouse: true } } } });
  },
  findMany(where: any, skip = 0, take = 20) {
    return prisma.product.findMany({ where, include: { category: true, unitOfMeasure: true, supplier: true }, skip, take, orderBy: { createdAt: 'desc' } });
  },
  count(where: any) { return prisma.product.count({ where }); },
  update(id: string, data: any) { return prisma.product.update({ where: { id }, data }); },
  findBySku(sku: string) { return prisma.product.findUnique({ where: { sku } }); },
};