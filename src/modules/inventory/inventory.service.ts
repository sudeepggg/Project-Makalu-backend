import { prisma } from '../../config/database';
import { NotFoundError, ValidationError } from '../../utils/errors';
import { logger } from '../../utils/logger';
import { STOCK_MOVEMENT_TYPES } from '../../config/constants';

export const inventoryService = {
  async receiveStock(productId: string, warehouseId: string, quantity: number, referenceId?: string) {
    if (quantity <= 0) throw new ValidationError('Quantity must be > 0');

    let inventory = await prisma.inventory.findUnique({ where: { productId_warehouseId: { productId, warehouseId } } });
    if (!inventory) {
      inventory = await prisma.inventory.create({ data: { productId, warehouseId, quantityOnHand: 0, quantityReserved: 0, quantityAvailable: 0 } });
    }

    const updated = await prisma.inventory.update({ where: { id: inventory.id }, data: { quantityOnHand: { increment: quantity }, quantityAvailable: { increment: quantity }, lastStockCheckDate: new Date() } });

    await prisma.stockMovement.create({ data: { productId, warehouseId, movementType: STOCK_MOVEMENT_TYPES.IN, quantity, referenceType: 'PURCHASE', referenceId } });

    logger.info('Stock received', { productId, warehouseId, quantity });
    return updated;
  },

  async adjustStock(productId: string, warehouseId: string, currentQuantity: number, newQuantity: number, reason: string) {
    const inventory = await prisma.inventory.findUnique({ where: { productId_warehouseId: { productId, warehouseId } } });
    if (!inventory) throw new NotFoundError('Inventory not found');
    if (inventory.quantityOnHand !== currentQuantity) throw new ValidationError('Current quantity mismatch');

    const updated = await prisma.inventory.update({ where: { id: inventory.id }, data: { quantityOnHand: newQuantity, quantityAvailable: newQuantity - inventory.quantityReserved, lastStockCheckDate: new Date() } });

    await prisma.stockMovement.create({ data: { productId, warehouseId, movementType: STOCK_MOVEMENT_TYPES.ADJUSTMENT, quantity: Math.abs(newQuantity - currentQuantity), referenceType: 'ADJUSTMENT', notes: reason } });

    logger.info('Stock adjusted', { productId, warehouseId, old: currentQuantity, new: newQuantity });
    return updated;
  },

  async listInventory(warehouseId?: string) {
    const where: any = {};
    if (warehouseId) where.warehouseId = warehouseId;
    return prisma.inventory.findMany({ where, include: { product: true, warehouse: true }, orderBy: { updatedAt: 'desc' } });
  },

  async getStockMovements(productId?: string, warehouseId?: string, limit = 100) {
    const where: any = {};
    if (productId) where.productId = productId;
    if (warehouseId) where.warehouseId = warehouseId;
    return prisma.stockMovement.findMany({ where, include: { product: true, warehouse: true }, orderBy: { createdAt: 'desc' }, take: limit });
  },

  async getLowStockAlerts(warehouseId?: string) {
    const where: any = {};
    if (warehouseId) where.warehouseId = warehouseId;
    const inv = await prisma.inventory.findMany({ where, include: { product: true, warehouse: true } });
    return inv.filter(i => i.quantityAvailable <= i.product.reorderLevel);
  },
};