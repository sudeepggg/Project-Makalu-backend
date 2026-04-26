import { prisma } from '../../config/database';

export const inventoryRepository = {
  find(productId: string, warehouseId: string) {
    return prisma.inventory.findUnique({ where: { productId_warehouseId: { productId, warehouseId } }, include: { product: true, warehouse: true } });
  },

  create(data: any) { return prisma.inventory.create({ data }); },
  update(id: string, data: any) { return prisma.inventory.update({ where: { id }, data }); },
  findMany(where: any) { return prisma.inventory.findMany({ where, include: { product: true, warehouse: true }, orderBy: { updatedAt: 'desc' } }); },
  createStockMovement(data: any) { return prisma.stockMovement.create({ data }); },
  findStockMovements(where: any, take = 100) { return prisma.stockMovement.findMany({ where, include: { product: true, warehouse: true }, orderBy: { createdAt: 'desc' }, take }); },
};