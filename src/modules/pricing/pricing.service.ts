import { prisma } from "../../config/database";
import { NotFoundError, ValidationError } from "../../utils/errors";
import { pricingRepository } from "./pricing.repository";

export const pricingService = {
  // Returns only the targeted price data comparison list for frontend views
  async getCustomerPriceComparisonList(customerId: string) {
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw new NotFoundError("Customer not found");

    const products = await prisma.product.findMany({ where: { isActive: true } });
    
    const results = [];
    for (const product of products) {
      const cPricing = await pricingRepository.findCustomerProductPricing(customerId, product.id);

      results.push({
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        
        // Base Price Mapping & Comparison
        originalBasePrice: product.basePrice,
        overrideBasePrice: cPricing?.basePrice ?? null,
        basePriceDiff: cPricing?.basePrice ? cPricing.basePrice - product.basePrice : 0,
        
        // Cost Price Mapping & Comparison
        originalCostPrice: product.costPrice,
        overrideCostPrice: cPricing?.costPrice ?? null,
        costPriceDiff: cPricing?.costPrice ? cPricing.costPrice - product.costPrice : 0,

        customerProductPricingId: cPricing?.id ?? null
      });
    }

    return results;
  },

  // Atomically manages overrides for both base and cost modifications
  async overridePrice(
    customerId: string,
    productId: string,
    userId: string,
    newBasePrice?: number,
    newCostPrice?: number,
    reason?: string,
  ) {
    if (newBasePrice === undefined && newCostPrice === undefined) {
      throw new ValidationError("Must provide at least one price rule to override.");
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundError("Product not found");

    return await prisma.$transaction(async (tx) => {
      const existing = await tx.customerProductPricing.findUnique({
        where: { customerId_productId: { customerId, productId } },
      });

      const oldBase = existing?.basePrice ?? product.basePrice;
      const oldCost = existing?.costPrice ?? product.costPrice;

      const updated = await tx.customerProductPricing.upsert({
        where: { customerId_productId: { customerId, productId } },
        create: {
          customerId,
          productId,
          basePrice: newBasePrice ?? null,
          costPrice: newCostPrice ?? null,
          effectiveDate: new Date(),
          isActive: true,
        },
        update: {
          basePrice: newBasePrice !== undefined ? newBasePrice : existing?.basePrice,
          costPrice: newCostPrice !== undefined ? newCostPrice : existing?.costPrice,
        },
      });

      const overrideLog = await tx.pricingOverride.create({
        data: {
          customerProductPricingId: updated.id,
          userId,
          oldBasePrice: oldBase,
          newBasePrice: newBasePrice ?? oldBase,
          oldCostPrice: oldCost,
          newCostPrice: newCostPrice ?? oldCost,
          reason: reason || "Price modification update",
        },
      });

      return { updated, override: overrideLog };
    });
  }
};