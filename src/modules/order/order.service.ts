import { prisma } from "../../config/database";
import { NotFoundError, ValidationError } from "../../utils/errors";
import { ORDER_STATUSES } from "../../config/constants";
import { logger } from "../../utils/logger";
import { orderRepository } from "./order.repository";
import { UpdateOrderInput } from "./order.validation";
import { pricingService } from "../pricing/pricing.service";

export const orderService = {
  async createOrder(userId: string, payload: any) {
    const customer = await prisma.customer.findUnique({
      where: { id: payload.customerId },
    });
    if (!customer) throw new NotFoundError("Customer not found");

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
        if (!prod) throw new NotFoundError(`Product ${it.productId} not found`);

        const discount = it.discountPercentage ?? 0;
        const lineTotal =
          it.quantity * priceRes.finalPrice * (1 - discount / 100);

        return {
          productId: it.productId,
          quantity: it.quantity,
          unitPrice: priceRes.finalPrice,
          baseUnitPrice: priceRes.basePrice, // product's original base price
          costUnitPrice: priceRes.costPrice, // resolved cost price
          discountPercentage: discount,
          lineTotal,
        };
      }),
    );

    const subtotal = itemsData.reduce((sum, it) => sum + it.lineTotal, 0);

    const order = await orderRepository.create({
      orderNumber: await this.generateOrderNumber(),
      customerId: payload.customerId,
      userId,
      status: ORDER_STATUSES.DRAFT,
      subtotal,
      total: subtotal,
      currency: payload.currency ?? "NPR",
      notes: payload.notes,
      expectedDeliveryDate: payload.expectedDeliveryDate
        ? new Date(payload.expectedDeliveryDate)
        : undefined,
      items: { create: itemsData },
    });

    logger.info("Order created", { orderId: order.id });
    return order;
  },

  async updateOrder(
    orderId: string,
    userId: string,
    payload: UpdateOrderInput,
  ) {
    const order = await orderRepository.findById(orderId);
    if (!order) throw new NotFoundError("Order not found");
    if (order.status !== ORDER_STATUSES.DRAFT)
      throw new ValidationError("Only DRAFT orders can be updated");

    if (payload.customerId && payload.customerId !== order.customerId) {
      const customer = await prisma.customer.findUnique({
        where: { id: payload.customerId },
      });
      if (!customer) throw new NotFoundError("Customer not found");
    }

    const customerId = payload.customerId ?? order.customerId;

    return await prisma.$transaction(async (tx) => {
      let subtotal = order.subtotal;

      if (payload.items && payload.items.length > 0) {
        const toDelete = payload.items.filter((it) => it._delete && it.id);
        const toUpdate = payload.items.filter((it) => !it._delete && it.id);
        const toCreate = payload.items.filter((it) => !it._delete && !it.id);

        if (toDelete.length > 0) {
          await tx.orderItem.deleteMany({
            where: {
              id: { in: toDelete.map((it) => it.id as string) },
              orderId,
            },
          });
        }

        for (const it of toUpdate) {
          const [prod, priceRes] = await Promise.all([
            tx.product.findUnique({ where: { id: it.productId } }),
            pricingService.calculatePrice(
              customerId,
              it.productId,
              it.quantity,
            ),
          ]);
          if (!prod)
            throw new NotFoundError(`Product ${it.productId} not found`);

          const discount = it.discountPercentage ?? 0;
          const lineTotal =
            it.quantity * priceRes.finalPrice * (1 - discount / 100);

          await tx.orderItem.update({
            where: { id: it.id as string },
            data: {
              productId: it.productId,
              quantity: it.quantity,
              unitPrice: priceRes.finalPrice,
              baseUnitPrice: priceRes.basePrice, // product's original base price
              costUnitPrice: priceRes.costPrice, // resolved cost price
              discountPercentage: discount,
              lineTotal,
            },
          });
        }

        const allItems = await tx.orderItem.findMany({ where: { orderId } });
        if (allItems.length === 0)
          throw new ValidationError("Order must have at least one item");

        subtotal = allItems.reduce((sum, it) => sum + it.lineTotal, 0);
      }

      const updated = await tx.order.update({
        where: { id: orderId },
        data: {
          ...(payload.customerId && { customerId: payload.customerId }),
          ...(payload.currency && { currency: payload.currency }),
          ...(payload.notes !== undefined && { notes: payload.notes }),
          ...(payload.expectedDeliveryDate && {
            expectedDeliveryDate: new Date(payload.expectedDeliveryDate),
          }),
          ...(payload.items && { subtotal, total: subtotal }),
        },
        include: {
          items: { include: { product: true } },
          customer: true,
          payments: true,
        },
      });

      logger.info("Order updated", { orderId, userId });
      return updated;
    });
  },

  async confirmOrder(orderId: string) {
    const order = await orderRepository.findById(orderId);
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
    return orderRepository.findById(orderId);
  },

  async dispatchOrder(orderId: string) {
    const order = await orderRepository.findById(orderId);
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
    return orderRepository.findById(orderId);
  },

  async deliverOrder(orderId: string) {
    const order = await orderRepository.findById(orderId);
    if (!order) throw new NotFoundError("Order not found");
    if (order.status !== ORDER_STATUSES.DISPATCHED)
      throw new ValidationError("Order not dispatched");

    await orderRepository.update(orderId, {
      status: ORDER_STATUSES.DELIVERED,
      deliveredDate: new Date(),
    });

    logger.info("Order delivered", { orderId });
    return orderRepository.findById(orderId);
  },

  async getOrder(orderId: string) {
    const order = await orderRepository.findById(orderId);
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
      orderRepository.findMany(where, skip, limit),
      orderRepository.count(where),
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
    const count = await orderRepository.count({
      orderDate: {
        gte: new Date(y, now.getMonth(), now.getDate()),
        lt: new Date(y, now.getMonth(), now.getDate() + 1),
      },
    });
    return `ORD-${y}${m}${d}-${String(count + 1).padStart(4, "0")}`;
  },

  async deleteOrder(orderId: string, userId: string) {
    const order = await orderRepository.findById(orderId);
    if (!order) throw new NotFoundError("Order not found");

    // Only DRAFT orders can be deleted (safety)
    if (order.status !== ORDER_STATUSES.DRAFT) {
      throw new ValidationError("Only DRAFT orders can be deleted");
    }

    // Optional: soft delete instead of hard delete
    // return await orderRepository.update(orderId, { deletedAt: new Date() });

    const deleted = await orderRepository.delete(orderId);

    logger.info("Order deleted", { orderId, userId });
    return deleted;
  },
};
