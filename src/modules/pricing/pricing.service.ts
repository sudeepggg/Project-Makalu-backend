import { prisma } from "../../config/database";
import { NotFoundError, ValidationError } from "../../utils/errors";
import { pricingRepository } from "./pricing.repository";

export const pricingService = {
  async getCustomerPriceComparisonList(customerId: string) {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });
    if (!customer) throw new NotFoundError("Customer not found");

    const products = await prisma.product.findMany({
      where: { isActive: true },
    });

    const results = [];
    for (const product of products) {
      const cPricing = await pricingRepository.findCustomerProductPricing(
        customerId,
        product.id,
      );

      results.push({
        productId: product.id,
        productName: product.name,
        sku: product.sku,

        originalBasePrice: product.basePrice,
        overrideBasePrice: cPricing?.baseprice ?? null,
        basePriceDiff:
          cPricing?.baseprice != null
            ? cPricing.baseprice - product.basePrice
            : 0,

        originalCostPrice: product.costPrice ?? 0,
        overrideCostPrice: cPricing?.costPrice ?? null,
        costPriceDiff:
          cPricing?.costPrice != null
            ? cPricing.costPrice - (product.costPrice ?? 0)
            : 0,

        customerProductPricingId: cPricing?.id ?? null,
      });
    }

    return results;
  },

  async getOverrideHistoryByCustomer(customerId: string) {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });
    if (!customer) throw new NotFoundError("Customer not found");

    const history =
      await pricingRepository.findOverrideHistoryByCustomer(customerId);

    return history.map((entry) => ({
      overrideId: entry.id,
      product: entry.customerProductPricing.product,
      overriddenBy: entry.user,
      oldPrice: entry.oldPrice,
      newPrice: entry.newPrice,
      reason: entry.reason,
      createdAt: entry.createdAt,
    }));
  },

  async overridePrice(
    customerId: string,
    productId: string,
    userId: string,
    newBasePrice?: number,
    newCostPrice?: number,
    reason?: string,
  ) {
    if (newBasePrice === undefined && newCostPrice === undefined) {
      throw new ValidationError("Must provide at least one price to override.");
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) throw new NotFoundError("Product not found");

    return await prisma.$transaction(async (tx) => {
      const existing = await tx.customerProductPricing.findUnique({
        where: { customerId_productId: { customerId, productId } },
      });

      // baseprice = lowercase p per schema
      const oldBase = existing?.baseprice ?? product.basePrice;
      const oldCost = existing?.costPrice ?? product.costPrice ?? 0;

      const updated = await tx.customerProductPricing.upsert({
        where: { customerId_productId: { customerId, productId } },
        create: {
          customerId,
          productId,
          baseprice: newBasePrice ?? product.basePrice, // required field, fall back to product
          costPrice: newCostPrice ?? product.costPrice ?? 0,
          effectiveDate: new Date(),
          isActive: true,
        },
        update: {
          ...(newBasePrice !== undefined && { baseprice: newBasePrice }),
          ...(newCostPrice !== undefined && { costPrice: newCostPrice }),
        },
      });

      // PricingOverride schema only has oldPrice/newPrice — store base price change.
      // Cost price change is appended to reason for traceability without a migration.
      const costNote =
        newCostPrice !== undefined
          ? ` | Cost: ${oldCost} → ${newCostPrice}`
          : "";

      const overrideLog = await tx.pricingOverride.create({
        data: {
          customerProductPricingId: updated.id,
          userId,
          oldPrice: oldBase,
          newPrice: newBasePrice ?? oldBase,
          reason: `${reason ?? "Price modification update"}${costNote}`,
        },
      });

      return { updated, override: overrideLog };
    });
  },
  // Add this to pricingService in pricing.service.ts

  async calculatePrice(
    customerId: string,
    productId: string,
    quantity: number,
  ) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) throw new NotFoundError("Product not found");

    const cPricing = await pricingRepository.findCustomerProductPricing(
      customerId,
      productId,
    );

    // Use customer override base price if exists, otherwise fall back to product base price
    const finalPrice = cPricing?.baseprice ?? product.basePrice;
    const costPrice = cPricing?.costPrice ?? product.costPrice ?? 0;

    return {
      finalPrice,
      costPrice,
      basePrice: product.basePrice,
      overridePrice: cPricing?.baseprice ?? null,
      quantity,
      lineTotal: finalPrice * quantity,
    };
  },
};
