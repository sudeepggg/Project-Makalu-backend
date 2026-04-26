import { prisma } from '../../config/database';

export const paymentRepository = {
  create(data: any) { return prisma.payment.create({ data, include: { order: true, customer: true } }); },
  findById(id: string) { return prisma.payment.findUnique({ where: { id }, include: { order: true, customer: true } }); },
  findMany(where: any, skip = 0, take = 20) { return prisma.payment.findMany({ where, include: { order: true, customer: true }, skip, take, orderBy: { paymentDate: 'desc' } }); },
  count(where: any) { return prisma.payment.count({ where }); },
};