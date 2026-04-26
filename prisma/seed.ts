import { prisma } from '../src/config/database';
import bcrypt from 'bcrypt';
import { v4 as uuid } from 'uuid';

async function main() {
  console.log('🌱 Starting database seed...');

  // Create roles
  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: {
      id: uuid(),
      name: 'ADMIN',
      description: 'Administrator with full access',
    },
  });

  const salesRole = await prisma.role.upsert({
    where: { name: 'SALES_STAFF' },
    update: {},
    create: {
      id: uuid(),
      name: 'SALES_STAFF',
      description: 'Sales staff with limited access',
    },
  });

  // Create users
  const adminUser = await prisma.user.create({
    data: {
      id: uuid(),
      username: 'admin',
      email: 'admin@doms.local',
      passwordHash: await bcrypt.hash('admin@123', 10),
      firstName: 'Admin',
      lastName: 'User',
      isActive: true,
      roles: {
        create: {
          id: uuid(),
          roleId: adminRole.id,
        },
      },
    },
  });

  const sales1 = await prisma.user.create({
    data: {
      id: uuid(),
      username: 'sales1',
      email: 'sales1@doms.local',
      passwordHash: await bcrypt.hash('sales@123', 10),
      firstName: 'Ramesh',
      lastName: 'Patel',
      isActive: true,
      roles: {
        create: {
          id: uuid(),
          roleId: salesRole.id,
        },
      },
    },
  });

  // Create customer types
  const retailer = await prisma.customerType.create({
    data: {
      id: uuid(),
      name: 'Retailer',
      description: 'Retail stores',
    },
  });

  const wholesaler = await prisma.customerType.create({
    data: {
      id: uuid(),
      name: 'Wholesaler',
      description: 'Wholesale distributors',
    },
  });

  // Create category & UOM
  const electronics = await prisma.category.create({
    data: {
      id: uuid(),
      name: 'Electronics',
      description: 'Electronic devices',
      isActive: true,
    },
  });

  const piece = await prisma.unitOfMeasure.create({
    data: {
      id: uuid(),
      name: 'Piece',
      abbreviation: 'PC',
    },
  });

  // Create warehouse
  const warehouse = await prisma.warehouse.create({
    data: {
      id: uuid(),
      name: 'Main Warehouse',
      location: 'Kathmandu',
      isActive: true,
    },
  });

  // Create customers
  const customer1 = await prisma.customer.create({
    data: {
      id: uuid(),
      name: 'Kathmandu Store',
      customerTypeId: retailer.id,
      email: 'kathmandu@store.com',
      city: 'Kathmandu',
      creditLimit: 500000,
      isActive: true,
    },
  });

  // Create products
  const product1 = await prisma.product.create({
    data: {
      id: uuid(),
      sku: 'ELEC-001',
      name: 'USB Charger 2.4A',
      categoryId: electronics.id,
      unitOfMeasureId: piece.id,
      basePrice: 599,
      costPrice: 350,
      isActive: true,
    },
  });

  // Create inventory
  await prisma.inventory.create({
    data: {
      id: uuid(),
      productId: product1.id,
      warehouseId: warehouse.id,
      quantityOnHand: 500,
      quantityReserved: 0,
      quantityAvailable: 500,
    },
  });

  console.log('✨ Seed completed successfully!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });