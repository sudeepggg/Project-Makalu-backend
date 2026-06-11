import { prisma } from '../../config/database';

export const pricingRepository = {
  findCustomerProductPricing(customerId: string, productId: string) {
    return prisma.customerProductPricing.findUnique({ 
      where: { customerId_productId: { customerId, productId } } 
    });
  }
};