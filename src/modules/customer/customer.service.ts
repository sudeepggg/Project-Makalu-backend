import { prisma } from "../../config/database";
import {
  NotFoundError,
  ValidationError,
  ConflictError,
} from "../../utils/errors";
import { logger } from "../../utils/logger";

export const customerService = {
  async createCustomer(input: any) {
    if (!input.name) throw new ValidationError("Name required");

    if (input.registrationNumber) {
      const existing = await prisma.customer.findUnique({
        where: { registrationNumber: input.registrationNumber },
      });
      if (existing) throw new ConflictError("Registration number exists");
    }

    if (input.email) {
      const emailExists = await prisma.customer.findFirst({
        where: { email: input.email },
      });
      if (emailExists) throw new ConflictError("Email already in use");
    }

    if (input.phone) {
      const phoneExists = await prisma.customer.findFirst({
        where: { phone: input.phone },
      });
      if (phoneExists) throw new ConflictError("Phone number already in use");
    }

    const ct = await prisma.customerType.findUnique({
      where: { id: input.customerTypeId },
    });
    if (!ct) throw new NotFoundError("Customer type not found");

    const customer = await prisma.customer.create({
      data: { ...input },
    });

    logger.info("Customer created", { customerId: customer.id });
    return customer;
  },

  async getCustomer(id: string) {
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        customerType: true,
        orders: { take: 10, orderBy: { orderDate: "desc" } },
        payments: { take: 10, orderBy: { paymentDate: "desc" } },
      },
    });
    if (!customer) throw new NotFoundError("Customer not found");
    return customer;
  },

  async listCustomers(page = 1, limit = 20, filters?: any) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (filters?.search)
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { email: { contains: filters.search, mode: "insensitive" } },
      ];
    if (filters?.customerTypeId) where.customerTypeId = filters.customerTypeId;
    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive === "true" || filters.isActive === true;
    }
    if (filters?.city) {
      where.city = { contains: filters.city, mode: "insensitive" };
    }
    const [data, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        include: { customerType: true },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.customer.count({ where }),
    ]);

    return {
      data,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  },

  async updateCustomer(id: string, input: any) {
    const customer = await prisma.customer.findUnique({ where: { id } });
    if (!customer) throw new NotFoundError("Customer not found");

    // Unique email check (exclude self)
    if (input.email) {
      const emailExists = await prisma.customer.findFirst({
        where: { email: input.email, NOT: { id } },
      });
      if (emailExists) throw new ConflictError("Email already in use");
    }

    // Unique phone check (exclude self)
    if (input.phone) {
      const phoneExists = await prisma.customer.findFirst({
        where: { phone: input.phone, NOT: { id } },
      });
      if (phoneExists) throw new ConflictError("Phone number already in use");
    }

    const updated = await prisma.customer.update({
      where: { id },
      data: input,
    });
    logger.info("Customer updated", { customerId: id });
    return updated;
  },

  async toggleActive(id: string) {
    const customer = await prisma.customer.findUnique({ where: { id } });
    if (!customer) throw new NotFoundError("Customer not found");
    const updated = await prisma.customer.update({
      where: { id },
      data: { isActive: !customer.isActive },
    });
    return updated;
  },

  async listCustomerTypes() {
    return prisma.customerType.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
  },
};
