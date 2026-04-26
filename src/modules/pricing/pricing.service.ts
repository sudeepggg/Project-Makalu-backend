import { prisma } from '../../config/database';
import { NotFoundError, ValidationError } from '../../utils/errors';
import { logger } from '../../utils/logger';

export const pricingService = {
  // returns final price result including applied rule
  async calculatePrice(customerId: string, productId: string, quantity = 1) {
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw new NotFoundError('Customer not found');

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundError('Product not found');

    const now = new Date();

    // 1. customer-specific
    const cPricing = await prisma.customerProductPricing.findUnique({ where: { customerId_productId: { customerId, productId } } });
    if (cPricing && cPricing.isActive && (!cPricing.expiryDate || cPricing.expiryDate > now)) {
      const discount = cPricing.discountPercentage || 0;
      const final = cPricing.price * (1 - discount / 100);
      await prisma.pricingHistory.create({ data: { customerId, productId, price: cPricing.price, discountPercentage: discount, pricingRuleType: 'CUSTOMER_SPECIFIC', pricingRuleId: cPricing.id } });
      return { price: cPricing.price, discountPercentage: discount, finalPrice: final, rule: 'CUSTOMER_SPECIFIC' };
    }

    // 2. promotional price lists mapped to customer
    const mappings = await prisma.priceListCustomer.findMany({ where: { customerId }, include: { priceList: { include: { items: true } } } });
    const activePLs = mappings.map(m => m.priceList).filter(pl => pl.isActive && pl.effectiveDate <= now && (!pl.expiryDate || pl.expiryDate > now)).sort((a,b)=>b.priority-a.priority);
    for (const pl of activePLs) {
      const item = pl.items.find(i => i.productId === productId);
      if (item) {
        const discount = item.discountPercentage || 0;
        const final = item.price * (1 - discount / 100);
        await prisma.pricingHistory.create({ data: { customerId, productId, price: item.price, discountPercentage: discount, pricingRuleType: 'PROMOTIONAL', pricingRuleId: pl.id } });
        return { price: item.price, discountPercentage: discount, finalPrice: final, rule: 'PROMOTIONAL' };
      }
    }

    // 3. customer-type / base fallback: use product.basePrice
    const base = product.basePrice;
    await prisma.pricingHistory.create({ data: { customerId, productId, price: base, pricingRuleType: 'BASE', pricingRuleId: product.id } });
    return { price: base, discountPercentage: 0, finalPrice: base, rule: 'BASE' };
  },

  async setCustomerPrice(customerId: string, productId: string, price: number, discountPercentage?: number, expiryDate?: string) {
    if (price < 0) throw new ValidationError('Price invalid');
    const upsert = await prisma.customerProductPricing.upsert({
      where: { customerId_productId: { customerId, productId } },
      update: { price, discountPercentage, expiryDate: expiryDate ? new Date(expiryDate) : null, isActive: true },
      create: { customerId, productId, price, discountPercentage: discountPercentage ?? 0, effectiveDate: new Date(), expiryDate: expiryDate ? new Date(expiryDate) : null, isActive: true },
    });
    return upsert;
  },

  async overridePrice(customerId: string, productId: string, userId: string, newPrice: number, reason?: string) {
    const pricing = await prisma.customerProductPricing.findUnique({ where: { customerId_productId: { customerId, productId } } });
    if (!pricing) throw new NotFoundError('Customer pricing not found');
    const old = pricing.price;
    const updated = await prisma.customerProductPricing.update({ where: { id: pricing.id }, data: { price: newPrice } });
    const override = await prisma.pricingOverride.create({ data: { customerProductPricingId: pricing.id, userId, oldPrice: old, newPrice, reason } });
    return { updated, override };
  },

  async createPriceList(data: any) {
    const pl = await prisma.priceList.create({ data: { name: data.name, description: data.description, effectiveDate: new Date(data.effectiveDate || Date.now()), expiryDate: data.expiryDate ? new Date(data.expiryDate) : null, priority: data.priority || 0, items: { create: data.items } } , include: { items: true } });
    return pl;
  },

  async getActivePriceLists() { return prisma.priceList.findMany({ where: { isActive: true }, include: { items: { include: { product: true } }, customerMappings: { include: { customer: true } } }, orderBy: { priority: 'desc' } }); },

  async getPricingHistory(customerId: string, productId: string, limit = 100) {
    return prisma.pricingHistory.findMany({ where: { customerId, productId }, orderBy: { appliedDate: 'desc' }, take: limit });
  },
};