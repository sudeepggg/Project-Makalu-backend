import { prisma } from '../../config/database';

export const reportService = {
  async getSalesReport(dateFrom?: Date, dateTo?: Date) {
    const where: any = { status: { in: ['CONFIRMED','DISPATCHED','DELIVERED'] } };
    if (dateFrom || dateTo) { where.orderDate = {}; if (dateFrom) where.orderDate.gte = dateFrom; if (dateTo) where.orderDate.lte = dateTo; }
    const orders = await prisma.order.findMany({ where, include: { items: { include: { product: true } } } });
    let totalSales = 0, totalQty = 0;
    const byProduct: Record<string, any> = {};
    for (const o of orders) {
      for (const it of o.items) {
        totalSales += it.lineTotal;
        totalQty += it.quantity;
        const key = it.productId;
        if (!byProduct[key]) byProduct[key] = { productId: it.productId, sku: it.product.sku, name: it.product.name, quantity: 0, sales: 0 };
        byProduct[key].quantity += it.quantity;
        byProduct[key].sales += it.lineTotal;
      }
    }
    return { totalSales, totalQty, byProduct: Object.values(byProduct).sort((a:any,b:any)=>b.sales-a.sales) };
  },

  async getInventoryReport() {
    const inv = await prisma.inventory.findMany({ include: { product: true, warehouse: true } });
    let totalValue = 0;
    const byWarehouse: Record<string, any> = {};
    for (const i of inv) {
      const value = i.quantityOnHand * (i.product.basePrice || 0);
      totalValue += value;
      const w = i.warehouse.name;
      byWarehouse[w] ??= { items: 0, quantity: 0, value: 0 };
      byWarehouse[w].items++; byWarehouse[w].quantity += i.quantityOnHand; byWarehouse[w].value += value;
    }
    return { totalItems: inv.length, totalValue, byWarehouse };
  },

  async getDashboardKPIs() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthOrders = await prisma.order.findMany({ where: { orderDate: { gte: monthStart }, status: { in: ['CONFIRMED','DISPATCHED','DELIVERED'] } } });
    const thisMonthSales = thisMonthOrders.reduce((s,o)=>s+o.total,0);
    const outstanding = await prisma.payment.findMany({ where: { status: 'PENDING' } });
    const totalOutstanding = outstanding.reduce((s,p)=>s+p.amount,0);
    return { thisMonthSales, totalOutstanding, pendingOrders: await prisma.order.count({ where: { status: { in: ['DRAFT','CONFIRMED'] } } }) };
  },
};