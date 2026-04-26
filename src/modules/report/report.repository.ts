import { prisma } from '../../config/database';

export const reportRepository = {
  findOrders(where: any) { return prisma.order.findMany({ where, include: { items: { include: { product: true } }, customer: true } }); },
  findCustomers(where: any) { return prisma.customer.findMany({ where, include: { orders: { include: { items: true, payments: true } }, customerType: true } }); },
  findInventories(where: any) { return prisma.inventory.findMany({ where, include: { product: true, warehouse: true } }); },
  findPayments(where: any) { return prisma.payment.findMany({ where, include: { customer: true } }); },
};