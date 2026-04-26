import { prisma } from '../../config/database';
import { NotFoundError, ValidationError } from '../../utils/errors';
import { ORDER_STATUSES } from '../../config/constants';
import { pricingService } from '../pricing/pricing.service';
import { logger } from '../../utils/logger';

export const orderService = {
  async createOrder(userId: string, payload: any) {
    const customer = await prisma.customer.findUnique({ where: { id: payload.customerId } });
    if (!customer) throw new NotFoundError('Customer not found');
    if (!payload.items || payload.items.length === 0) throw new ValidationError('Order items required');

    let subtotal = 0;
    const itemsData = [];
    for (const it of payload.items) {
      const prod = await prisma.product.findUnique({ where: { id: it.productId } });
      if (!prod) throw new NotFoundError(`Product ${it.productId} not found`);

      // pricing engine
      const priceRes = await pricingService.calculatePrice(payload.customerId, it.productId, it.quantity);
      const unitPrice = priceRes.finalPrice;
      const discount = it.discountPercentage || 0;
      const lineTotal = it.quantity * unitPrice * (1 - discount / 100);
      subtotal += lineTotal;

      itemsData.push({ productId: it.productId, quantity: it.quantity, unitPrice, discountPercentage: discount, lineTotal });
    }

    const order = await prisma.order.create({
      data: { orderNumber: await this.generateOrderNumber(), customerId: payload.customerId, userId, status: ORDER_STATUSES.DRAFT, subtotal, total: subtotal, currency: 'NPR', notes: payload.notes, expectedDeliveryDate: payload.expectedDeliveryDate ? new Date(payload.expectedDeliveryDate) : undefined, items: { create: itemsData } },
      include: { items: { include: { product: true } }, customer: true },
    });

    logger.info('Order created', { orderId: order.id });
    return order;
  },

  async confirmOrder(orderId: string) {
    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order) throw new NotFoundError('Order not found');
    if (order.status !== ORDER_STATUSES.DRAFT) throw new ValidationError('Order cannot be confirmed');

    // simplistic reservation logic: check inventory in any active warehouse
    for (const item of order.items) {
      const inv = await prisma.inventory.findFirst({ where: { productId: item.productId, quantityAvailable: { gte: item.quantity } } });
      if (!inv) throw new ValidationError(`Insufficient stock for product ${item.productId}`);
      await prisma.inventory.update({ where: { id: inv.id }, data: { quantityReserved: { increment: item.quantity }, quantityAvailable: { decrement: item.quantity } } });
      await prisma.stockMovement.create({ data: { productId: item.productId, warehouseId: inv.warehouseId, movementType: 'OUT', quantity: item.quantity, referenceType: 'ORDER_RESERVE', referenceId: orderId } });
    }

    const updated = await prisma.order.update({ where: { id: orderId }, data: { status: ORDER_STATUSES.CONFIRMED, confirmedDate: new Date() }, include: { items: true, customer: true } });
    return updated;
  },

  async dispatchOrder(orderId: string) {
    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order) throw new NotFoundError('Order not found');
    if (order.status !== ORDER_STATUSES.CONFIRMED) throw new ValidationError('Order not in confirmed state');

    // pick from reserved inventory and decrement on-hand
    for (const item of order.items) {
      const inv = await prisma.inventory.findFirst({ where: { productId: item.productId, quantityReserved: { gte: item.quantity } } });
      if (!inv) throw new ValidationError('Reserved inventory not found');
      await prisma.inventory.update({ where: { id: inv.id }, data: { quantityReserved: { decrement: item.quantity }, quantityOnHand: { decrement: item.quantity } } });
      await prisma.stockMovement.create({ data: { productId: item.productId, warehouseId: inv.warehouseId, movementType: 'OUT', quantity: item.quantity, referenceType: 'ORDER_DISPATCH', referenceId: orderId } });
    }

    const updated = await prisma.order.update({ where: { id: orderId }, data: { status: ORDER_STATUSES.DISPATCHED, dispatchedDate: new Date() }, include: { items: true } });
    return updated;
  },

  async deliverOrder(orderId: string) {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundError('Order not found');
    if (order.status !== ORDER_STATUSES.DISPATCHED) throw new ValidationError('Order not dispatched');

    const updated = await prisma.order.update({ where: { id: orderId }, data: { status: ORDER_STATUSES.DELIVERED, deliveredDate: new Date() }, include: { items: true, customer: true } });
    return updated;
  },

  async getOrder(orderId: string) {
    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: { include: { product: true } }, customer: true, payments: true } });
    if (!order) throw new NotFoundError('Order not found');
    return order;
  },

  async listOrders(page = 1, limit = 20, filters?: any) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.customerId) where.customerId = filters.customerId;
    if (filters?.dateFrom || filters?.dateTo) { where.orderDate = {}; if (filters.dateFrom) where.orderDate.gte = new Date(filters.dateFrom); if (filters.dateTo) where.orderDate.lte = new Date(filters.dateTo); }
    const [data, total] = await Promise.all([prisma.order.findMany({ where, include: { customer: true, items: true }, skip, take: limit, orderBy: { orderDate: 'desc' } }), prisma.order.count({ where })]);
    return { data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  },

  private async generateOrderNumber() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const count = await prisma.order.count({ where: { orderDate: { gte: new Date(y, now.getMonth(), now.getDate()), lt: new Date(y, now.getMonth(), now.getDate() + 1) } } });
    return `ORD-${y}${m}${d}-${String(count + 1).padStart(4, '0')}`;
  },
};