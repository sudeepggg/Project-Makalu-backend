import { prisma } from '../../config/database';

export const customerRepository = {
  create(data: any) {
    return prisma.customer.create({ data });
  },

  findById(id: string) {
    return prisma.customer.findUnique({
      where: { id },
      include: { customerType: true, orders: true, payments: true },
    });
  },

  findMany(where: any, skip = 0, take = 20) {
    return prisma.customer.findMany({ where, include: { customerType: true }, skip, take, orderBy: { createdAt: 'desc' } });
  },

  count(where: any) {
    return prisma.customer.count({ where });
  },

  update(id: string, data: any) {
    return prisma.customer.update({ where: { id }, data });
  },

  toggleActive(id: string, newState: boolean) {
    return prisma.customer.update({ where: { id }, data: { isActive: newState } });
  },
};