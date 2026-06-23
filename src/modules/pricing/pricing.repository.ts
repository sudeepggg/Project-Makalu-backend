import { prisma } from '../../config/database';

export const pricingRepository = {
  findCustomerProductPricing(customerId: string, productId: string) {
    return prisma.customerProductPricing.findUnique({
      where: { customerId_productId: { customerId, productId } },
    });
  },

  findOverrideHistoryByCustomer(customerId: string) {
    return prisma.pricingOverride.findMany({
      where: {
        customerProductPricing: { customerId },
      },
      include: {
        customerProductPricing: {
          include: {
            product: { select: { id: true, name: true, sku: true } },
          },
        },
        user: { select: { id: true, username: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  },
};