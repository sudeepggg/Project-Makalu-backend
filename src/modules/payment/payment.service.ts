import { prisma } from "../../config/database";
import { NotFoundError, ValidationError } from "../../utils/errors";
import { PAYMENT_STATUSES, ORDER_STATUSES } from "../../config/constants";
import { logger } from "../../utils/logger";
import { paymentRepository } from "./payment.repository";

export const paymentService = {
  async recordPayment(input: any) {
    if (input.amount <= 0) throw new ValidationError("Amount must be > 0");

    const order = await prisma.order.findUnique({
      where: { id: input.orderId },
    });
    if (!order) throw new NotFoundError("Order not found");

    if (order.customerId !== input.customerId) {
      throw new ValidationError("Order does not belong to this customer");
    }

    const customer = await prisma.customer.findUnique({
      where: { id: input.customerId },
    });
    if (!customer) throw new NotFoundError("Customer not found");

    // ── Outstanding balance scoped to this specific order only ──────────────
    const orderPaymentsExisting = await prisma.payment.findMany({
      where: {
        orderId: input.orderId,
        status: PAYMENT_STATUSES.COMPLETED,
      },
      select: { amount: true },
    });

    const totalPaidForOrder = orderPaymentsExisting.reduce(
      (s, p) => s + p.amount,
      0,
    );
    const outstanding = order.total - totalPaidForOrder;

    if (outstanding <= 0) {
      throw new ValidationError("This order is already fully paid");
    }

    if (input.amount > outstanding) {
      throw new ValidationError(
        `Payment amount (${input.amount}) exceeds outstanding balance (${outstanding}) for this order`,
      );
    }

    return await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: { ...input, status: PAYMENT_STATUSES.COMPLETED },
      });

      // ── Update customer creditUsed based on all their orders/payments ──────
      const [allOrders, allPayments] = await Promise.all([
        tx.order.findMany({
          where: {
            customerId: input.customerId,
            status: {
              in: [
                ORDER_STATUSES.CONFIRMED,
                ORDER_STATUSES.DISPATCHED,
                ORDER_STATUSES.DELIVERED,
                ORDER_STATUSES.PAID,
              ],
            },
          },
          select: { total: true },
        }),
        tx.payment.findMany({
          where: {
            customerId: input.customerId,
            status: PAYMENT_STATUSES.COMPLETED,
          },
          select: { amount: true },
        }),
      ]);

      const totalOrdered = allOrders.reduce((s, o) => s + o.total, 0);
      const totalPaidAll = allPayments.reduce((s, p) => s + p.amount, 0);

      await tx.customer.update({
        where: { id: input.customerId },
        data: { creditUsed: Math.max(0, totalOrdered - totalPaidAll) },
      });

      // ── Mark order as PAID if fully settled ─────────────────────────────
      const newOrderTotalPaid = totalPaidForOrder + input.amount;
      if (newOrderTotalPaid >= order.total) {
        await tx.order.update({
          where: { id: input.orderId },
          data: { status: ORDER_STATUSES.PAID },
        });
      }

      logger.info("Payment recorded", { paymentId: payment.id });
      return payment;
    });
  },

  async getPayment(id: string) {
    const p = await paymentRepository.findById(id);
    if (!p) throw new NotFoundError("Payment not found");
    return p;
  },

  async listPayments(page = 1, limit = 20, filters?: any) {
    const skip = (page - 1) * limit;
    const where: any = {
      status: {
        in: [
          ORDER_STATUSES.CONFIRMED,
          ORDER_STATUSES.DISPATCHED,
          ORDER_STATUSES.DELIVERED,
          ORDER_STATUSES.PAID,
        ],
      },
    };
    if (filters?.customerId) where.customerId = filters.customerId;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          customer: true,
          payments: {
            where: filters?.status ? { status: filters.status } : undefined,
            orderBy: { paymentDate: "desc" },
          },
        },
        skip,
        take: limit,
        orderBy: { orderDate: "desc" },
      }),
      prisma.order.count({ where }),
    ]);

    const data = orders.map((order) => {
      const totalPaid = order.payments
        .filter((p) => p.status === PAYMENT_STATUSES.COMPLETED)
        .reduce((s, p) => s + p.amount, 0);

      const paymentStatus =
        totalPaid <= 0
          ? "UNPAID"
          : totalPaid < order.total
            ? "PARTIALLY_PAID"
            : "PAID";

      return {
        ...order,
        totalPaid,
        paymentStatus,
      };
    });

    const filtered = filters?.paymentStatus
      ? data.filter((d) => d.paymentStatus === filters.paymentStatus)
      : data;

    return {
      data: filtered,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  },
};