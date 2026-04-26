import { prisma } from '../../config/database';

export const orderRepository = {
  create(data: any) { return prisma.order.create({ data, include: { items: { include: { product: true } }, customer: true } }); },
  findById(id: string) { return prisma.order.findUnique({ where: { id }, include: { items: { include: { product: true } }, customer: true, payments: true } }); },
  findMany(where: any, skip = 0, take = 20) { return prisma.order.findMany({ where, include: { customer: true, items: true }, skip, take, orderBy: { orderDate: 'desc' } }); },
  update(id: string, data: any) { return prisma.order.update({ where: { id }, data }); },
  count(where: any) { return prisma.order.count({ where }); },
};