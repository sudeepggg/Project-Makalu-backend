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

    const orders = await prisma.order.findMany({
      where: {
        customerId: input.customerId,
        status: { in: [ORDER_STATUSES.CONFIRMED, ORDER_STATUSES.DELIVERED] },
      },
      select: { total: true },
    });

    const existingPayments = await prisma.payment.findMany({
      where: {
        customerId: input.customerId,
        status: PAYMENT_STATUSES.COMPLETED,
      },
      select: { amount: true },
    });

    const totalOrdered = orders.reduce((s, o) => s + o.total, 0);
    const totalPaid = existingPayments.reduce((s, p) => s + p.amount, 0);
    const outstanding = totalOrdered - totalPaid;

    if (input.amount > outstanding) {
      throw new ValidationError(
        `Payment amount (${input.amount}) exceeds outstanding balance (${outstanding})`,
      );
    }

    // Save as PENDING — credit update happens only on verification
    const payment = await prisma.payment.create({
      data: { ...input, status: PAYMENT_STATUSES.PENDING },
      // include: { order: true, customer: true },
    });

    logger.info("Payment recorded", { paymentId: payment.id });
    return payment;
  },

  async verifyPayment(id: string, status: string, notes?: string) {
    if (
      ![PAYMENT_STATUSES.COMPLETED, PAYMENT_STATUSES.FAILED].includes(
        status as any,
      )
    ) {
      throw new ValidationError("Status must be COMPLETED or FAILED");
    }

    const payment = await paymentRepository.findById(id);
    if (!payment) throw new NotFoundError("Payment not found");
    if (payment.status !== PAYMENT_STATUSES.PENDING) {
      throw new ValidationError("Only PENDING payments can be verified");
    }

    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id },
        data: { status, notes },
      });

      if (status === PAYMENT_STATUSES.COMPLETED) {
        const orders = await tx.order.findMany({
          where: {
            customerId: payment.customerId,
            status: {
              in: [ORDER_STATUSES.CONFIRMED, ORDER_STATUSES.DELIVERED],
            },
          },
          select: { total: true },
        });

        const completedPayments = await tx.payment.findMany({
          where: {
            customerId: payment.customerId,
            status: PAYMENT_STATUSES.COMPLETED,
          },
          select: { amount: true },
        });

        const totalOrdered = orders.reduce((s, o) => s + o.total, 0);
        const totalPaid =
          completedPayments.reduce((s, p) => s + p.amount, 0) + payment.amount;

        await tx.customer.update({
          where: { id: payment.customerId },
          data: { creditUsed: totalOrdered - totalPaid },
        });

        const orderPayments = await tx.payment.findMany({
          where: {
            orderId: payment.orderId,
            status: PAYMENT_STATUSES.COMPLETED,
          },
          select: { amount: true },
        });

        const orderTotalPaid =
          orderPayments.reduce((s, p) => s + p.amount, 0) + payment.amount;
        const relatedOrder = await tx.order.findUnique({
          where: { id: payment.orderId },
          select: { total: true },
        });

        if (relatedOrder && orderTotalPaid >= relatedOrder.total) {
          await tx.order.update({
            where: { id: payment.orderId },
            data: { status: ORDER_STATUSES.PAID },
          });
        }
      }
    });

    logger.info("Payment verified", { paymentId: id, status });
    return paymentRepository.findById(id);
  },

  async getPayment(id: string) {
    const p = await paymentRepository.findById(id);
    if (!p) throw new NotFoundError("Payment not found");
    return p;
  },

  // payment.service.ts
  async listPayments(page = 1, limit = 20, filters?: any) {
    const skip = (page - 1) * limit;
    const where: any = {
      status: { in: [ORDER_STATUSES.CONFIRMED, ORDER_STATUSES.DELIVERED] },
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

    // filter by paymentStatus if requested
    const filtered = filters?.paymentStatus
      ? data.filter((d) => d.paymentStatus === filters.paymentStatus)
      : data;

    return {
      data: filtered,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  },
};
