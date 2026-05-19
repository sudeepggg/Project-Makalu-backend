import { prisma } from "../../config/database";
import { NotFoundError, ValidationError } from "../../utils/errors";
import { ORDER_STATUSES } from "../../config/constants";
import { pricingService } from "../pricing/pricing.service";
import { logger } from "../../utils/logger";

export const orderService = {
  async createOrder(userId: string, payload: any) {
    const customer = await prisma.customer.findUnique({
      where: { id: payload.customerId },
    });
    if (!customer) throw new NotFoundError("Customer not found");
    if (!payload.items || payload.items.length === 0)
      throw new ValidationError("Order items required");

    // parallel product lookup + pricing
    const itemsData = await Promise.all(
      payload.items.map(async (it: any) => {
        const [prod, priceRes] = await Promise.all([
          prisma.product.findUnique({ where: { id: it.productId } }),
          pricingService.calculatePrice(
            payload.customerId,
            it.productId,
            it.quantity,
          ),
        ]);
        if (!prod)
          throw new NotFoundError(`Product ${it.productId} not found`);

        const unitPrice = priceRes.finalPrice;
        const discount = it.discountPercentage || 0;
        const lineTotal = it.quantity * unitPrice * (1 - discount / 100);

        return {
          productId: it.productId,
          quantity: it.quantity,
          unitPrice,
          discountPercentage: discount,
          lineTotal,
        };
      }),
    );

    const subtotal = itemsData.reduce((sum, it) => sum + it.lineTotal, 0);

    const order = await prisma.order.create({
      data: {
        orderNumber: await this.generateOrderNumber(),
        customerId: payload.customerId,
        userId,
        status: ORDER_STATUSES.DRAFT,
        subtotal,
        total: subtotal,
        currency: "NPR",
        notes: payload.notes,
        expectedDeliveryDate: payload.expectedDeliveryDate
          ? new Date(payload.expectedDeliveryDate)
          : undefined,
        items: { create: itemsData },
      },
      include: { items: { include: { product: true } }, customer: true },
    });

    logger.info("Order created", { orderId: order.id });
    return order;
  },

  async confirmOrder(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) throw new NotFoundError("Order not found");
    if (order.status !== ORDER_STATUSES.DRAFT)
      throw new ValidationError("Order cannot be confirmed");

    await prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        const inv = await tx.inventory.findFirst({
          where: {
            productId: item.productId,
            quantityAvailable: { gte: item.quantity },
          },
        });
        if (!inv)
          throw new ValidationError(
            `Insufficient stock for product ${item.productId}`,
          );

        await tx.inventory.update({
          where: { id: inv.id },
          data: {
            quantityReserved: { increment: item.quantity },
            quantityAvailable: { decrement: item.quantity },
          },
        });

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            warehouseId: inv.warehouseId,
            movementType: "OUT",
            quantity: item.quantity,
            referenceType: "ORDER_RESERVE",
            referenceId: orderId,
          },
        });
      }

      await tx.order.update({
        where: { id: orderId },
        data: { status: ORDER_STATUSES.CONFIRMED, confirmedDate: new Date() },
      });
    });

    logger.info("Order confirmed", { orderId });
    return this.getOrder(orderId);
  },

  async dispatchOrder(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) throw new NotFoundError("Order not found");
    if (order.status !== ORDER_STATUSES.CONFIRMED)
      throw new ValidationError("Order not in confirmed state");

    await prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        const inv = await tx.inventory.findFirst({
          where: {
            productId: item.productId,
            quantityReserved: { gte: item.quantity },
          },
        });
        if (!inv)
          throw new ValidationError(
            `Reserved inventory not found for product ${item.productId}`,
          );

        await tx.inventory.update({
          where: { id: inv.id },
          data: {
            quantityReserved: { decrement: item.quantity },
            quantityOnHand: { decrement: item.quantity },
          },
        });

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            warehouseId: inv.warehouseId,
            movementType: "OUT",
            quantity: item.quantity,
            referenceType: "ORDER_DISPATCH",
            referenceId: orderId,
          },
        });
      }

      await tx.order.update({
        where: { id: orderId },
        data: {
          status: ORDER_STATUSES.DISPATCHED,
          dispatchedDate: new Date(),
        },
      });
    });

    logger.info("Order dispatched", { orderId });
    return this.getOrder(orderId);
  },

  async deliverOrder(orderId: string) {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundError("Order not found");
    if (order.status !== ORDER_STATUSES.DISPATCHED)
      throw new ValidationError("Order not dispatched");

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: { status: ORDER_STATUSES.DELIVERED, deliveredDate: new Date() },
      include: { items: true, customer: true },
    });

    logger.info("Order delivered", { orderId });
    return updated;
  },

  async getOrder(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { product: true } },
        customer: true,
        payments: true,
      },
    });
    if (!order) throw new NotFoundError("Order not found");
    return order;
  },

  async listOrders(page = 1, limit = 20, filters?: any) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.customerId) where.customerId = filters.customerId;
    if (filters?.dateFrom || filters?.dateTo) {
      where.orderDate = {};
      if (filters.dateFrom) where.orderDate.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.orderDate.lte = new Date(filters.dateTo);
    }

    const [data, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: { customer: true, items: true },
        skip,
        take: limit,
        orderBy: { orderDate: "desc" },
      }),
      prisma.order.count({ where }),
    ]);

    return {
      data,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  },

  async generateOrderNumber() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const count = await prisma.order.count({
      where: {
        orderDate: {
          gte: new Date(y, now.getMonth(), now.getDate()),
          lt: new Date(y, now.getMonth(), now.getDate() + 1),
        },
      },
    });
    return `ORD-${y}${m}${d}-${String(count + 1).padStart(4, "0")}`;
  },
};