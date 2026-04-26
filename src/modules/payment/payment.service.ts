import { prisma } from '../../config/database';
import { NotFoundError, ValidationError } from '../../utils/errors';
import { PAYMENT_STATUSES } from '../../config/constants';
import { logger } from '../../utils/logger';

export const paymentService = {
  async recordPayment(input: any) {
    if (input.amount <= 0) throw new ValidationError('Amount must be > 0');
    const order = await prisma.order.findUnique({ where: { id: input.orderId } });
    if (!order) throw new NotFoundError('Order not found');
    const customer = await prisma.customer.findUnique({ where: { id: input.customerId } });
    if (!customer) throw new NotFoundError('Customer not found');

    const payment = await prisma.payment.create({ data: { ...input, status: PAYMENT_STATUSES.COMPLETED }, include: { order: true, customer: true } });

    // update customer's creditUsed (simple calc)
    const orders = await prisma.order.findMany({ where: { customerId: input.customerId }, select: { total: true } });
    const payments = await prisma.payment.findMany({ where: { customerId: input.customerId, status: PAYMENT_STATUSES.COMPLETED }, select: { amount: true } });
    const totalDue = orders.reduce((s, o) => s + o.total, 0) - payments.reduce((s, p) => s + p.amount, 0);
    await prisma.customer.update({ where: { id: input.customerId }, data: { creditUsed: totalDue } });

    logger.info('Payment recorded', { paymentId: payment.id });
    return payment;
  },

  async getPayment(id: string) {
    const p = await prisma.payment.findUnique({ where: { id }, include: { order: { include: { items: { include: { product: true } } } }, customer: true } });
    if (!p) throw new NotFoundError('Payment not found');
    return p;
  },

  async listPayments(page = 1, limit = 20, filters?: any) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.customerId) where.customerId = filters.customerId;
    const [data, total] = await Promise.all([prisma.payment.findMany({ where, include: { order: true, customer: true }, skip, take: limit, orderBy: { paymentDate: 'desc' } }), prisma.payment.count({ where })]);
    return { data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  },
};