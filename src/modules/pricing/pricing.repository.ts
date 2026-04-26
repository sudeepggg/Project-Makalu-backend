import { prisma } from '../../config/database';

export const pricingRepository = {
  findCustomerProductPricing(customerId: string, productId: string) {
    return prisma.customerProductPricing.findUnique({ where: { customerId_productId: { customerId, productId } } });
  },

  upsertCustomerProductPricing(data: any) {
    return prisma.customerProductPricing.upsert({
      where: { customerId_productId: { customerId: data.customerId, productId: data.productId } },
      update: { price: data.price, discountPercentage: data.discountPercentage, expiryDate: data.expiryDate, isActive: data.isActive ?? true },
      create: { customerId: data.customerId, productId: data.productId, price: data.price, discountPercentage: data.discountPercentage ?? 0, effectiveDate: new Date(), expiryDate: data.expiryDate, isActive: data.isActive ?? true },
    });
  },

  createPricingOverride(data: any) { return prisma.pricingOverride.create({ data }); },

  findActivePriceListsForCustomer(customerId: string) {
    return prisma.priceListCustomer.findMany({ where: { customerId }, include: { priceList: { include: { items: true } } } });
  },

  findPriceListItemsForProduct(productId: string) {
    return prisma.priceListItem.findMany({ where: { productId }, include: { priceList: true } });
  },

  createPriceList(data: any) { return prisma.priceList.create({ data, include: { items: true } }); },

  getActivePriceLists() {
    return prisma.priceList.findMany({ where: { isActive: true }, include: { items: { include: { product: true } }, customerMappings: { include: { customer: true } } }, orderBy: { priority: 'desc' } });
  },

  logPricingHistory(data: any) { return prisma.pricingHistory.create({ data }); },

  getPricingHistory(customerId: string, productId: string, limit = 100) {
    return prisma.pricingHistory.findMany({ where: { customerId, productId }, orderBy: { appliedDate: 'desc' }, take: limit });
  },
};