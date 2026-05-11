import { PrismaClient, Role, MemberLevel, ProductStatus, PriceType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { phone: '13800000000' },
    update: {},
    create: {
      phone: '13800000000',
      nickname: '超级管理员',
      password: adminPassword,
      role: Role.SUPER_ADMIN,
      memberLevel: MemberLevel.GOLD,
      bindCode: 'ADMIN001',
    },
  });

  const agent1Password = await bcrypt.hash('agent123', 10);
  const agent1 = await prisma.user.upsert({
    where: { phone: '13800000001' },
    update: {},
    create: {
      phone: '13800000001',
      nickname: '一级代理-张三',
      password: agent1Password,
      role: Role.AGENT_L1,
      parentAgentId: admin.id,
      memberLevel: MemberLevel.GOLD,
      bindCode: 'AGENT1A',
    },
  });

  const agent2Password = await bcrypt.hash('agent123', 10);
  const agent2 = await prisma.user.upsert({
    where: { phone: '13800000002' },
    update: {},
    create: {
      phone: '13800000002',
      nickname: '二级代理-李四',
      password: agent2Password,
      role: Role.AGENT_L2,
      parentAgentId: agent1.id,
      memberLevel: MemberLevel.GOLD,
      bindCode: 'AGENT2A',
    },
  });

  const agent3Password = await bcrypt.hash('agent123', 10);
  const agent3 = await prisma.user.upsert({
    where: { phone: '13800000003' },
    update: {},
    create: {
      phone: '13800000003',
      nickname: '三级代理-王五',
      password: agent3Password,
      role: Role.AGENT_L3,
      parentAgentId: agent2.id,
      memberLevel: MemberLevel.GOLD,
      bindCode: 'AGENT3A',
    },
  });

  // 测试用户 - 普通用户
  const userPassword = await bcrypt.hash('user123', 10);
  const testUser = await prisma.user.upsert({
    where: { phone: '13900000001' },
    update: {},
    create: {
      phone: '13900000001',
      nickname: '测试用户',
      password: userPassword,
      role: Role.CUSTOMER,
      memberLevel: MemberLevel.BRONZE,
    },
  });

  // 测试用户 - 一级代理
  const testAgentPassword = await bcrypt.hash('agent123', 10);
  const testAgent = await prisma.user.upsert({
    where: { phone: '13800000001' },
    update: {},
    create: {
      phone: '13800000001',
      nickname: '一级代理',
      password: testAgentPassword,
      role: Role.AGENT_L1,
      memberLevel: MemberLevel.GOLD,
      bindCode: 'AGENT1A',
    },
  });

  // Create category
  const category = await prisma.category.upsert({
    where: { id: 'seed-category-skincare' },
    update: {},
    create: {
      id: 'seed-category-skincare',
      name: '护肤品',
      sort: 1,
    },
  });

  // Create product with SKU and prices
  const product = await prisma.product.upsert({
    where: { id: 'seed-product-cream' },
    update: {},
    create: {
      id: 'seed-product-cream',
      name: '高端面霜',
      description: '进口高端保湿面霜 50ml',
      images: ['/uploads/sample-cream.jpg'],
      categoryId: category.id,
      status: ProductStatus.ON_SALE,
      skus: {
        create: {
          id: 'seed-sku-cream-50ml',
          specs: { size: '50ml' },
          stock: 100,
          costPrice: 50,
          prices: {
            create: [
              { priceType: PriceType.AGENT_L1, price: 60 },
              { priceType: PriceType.AGENT_L2, price: 70 },
              { priceType: PriceType.AGENT_L3, price: 80 },
              { priceType: PriceType.MEMBER_GOLD, price: 85 },
              { priceType: PriceType.MEMBER_SILVER, price: 90 },
              { priceType: PriceType.MEMBER_BRONZE, price: 95 },
              { priceType: PriceType.RETAIL, price: 100 },
            ],
          },
        },
      },
    },
  });

  console.log('Seed data created successfully');
  console.log('Admin: 13800000000 / admin123');
  console.log('Agent L1: 13800000001 / agent123');
  console.log('Agent L2: 13800000002 / agent123');
  console.log('Agent L3: 13800000003 / agent123');
  console.log('Test User: 13900000001 / user123');
  console.log('Test Agent L1: 13800000001 / agent123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
