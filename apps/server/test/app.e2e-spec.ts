import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { RedisService } from '../src/modules/redis/redis.service';
import { JwtService } from '@nestjs/jwt';

/**
 * Mock PrismaService - simulates database responses
 */
const mockPrismaService: any = {
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  product: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  category: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
  order: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  sku: {
    findMany: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
  },
  skuPrice: {
    deleteMany: jest.fn(),
  },
  orderItem: {
    findMany: jest.fn(),
  },
  userCoupon: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  $transaction: jest.fn((fn: any) => fn(mockPrismaService)),
  $connect: jest.fn(),
  $disconnect: jest.fn(),
};

/**
 * Mock RedisService
 */
const mockRedisService = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  quit: jest.fn(),
};

describe('App E2E Tests', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  // Helper to generate a valid JWT token
  function generateToken(userId: string, role: string): string {
    return jwtService.sign({ sub: userId, role });
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .overrideProvider(RedisService)
      .useValue(mockRedisService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    jwtService = moduleFixture.get<JwtService>(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==================== 认证流程 ====================
  describe('Auth', () => {
    it('POST /auth/register - 注册新用户', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue({
        id: 'user-1',
        phone: '13900001111',
        role: 'CUSTOMER',
        memberLevel: 'BRONZE',
        bindCode: 'ABCD1234',
      });
      mockRedisService.set.mockResolvedValue('OK');

      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          phone: '13900001111',
          password: 'password123',
          nickname: '测试用户',
        })
        .expect(201);

      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      expect(mockPrismaService.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            phone: '13900001111',
            role: 'CUSTOMER',
          }),
        }),
      );
    });

    it('POST /auth/login - 手机号登录', async () => {
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('password123', 10);

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-1',
        phone: '13900001111',
        password: hashedPassword,
        role: 'CUSTOMER',
        frozen: false,
      });
      mockRedisService.set.mockResolvedValue('OK');

      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          phone: '13900001111',
          password: 'password123',
        })
        .expect(201);

      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
    });

    it('POST /auth/admin/login - 管理员登录', async () => {
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('admin123', 10);

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'admin-1',
        phone: '13800000000',
        password: hashedPassword,
        role: 'SUPER_ADMIN',
        frozen: false,
      });
      mockRedisService.set.mockResolvedValue('OK');

      const res = await request(app.getHttpServer())
        .post('/auth/admin/login')
        .send({
          phone: '13800000000',
          password: 'admin123',
        })
        .expect(201);

      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
    });

    it('POST /auth/admin/login - 普通用户无管理权限', async () => {
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('password123', 10);

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-1',
        phone: '13900001111',
        password: hashedPassword,
        role: 'CUSTOMER',
        frozen: false,
      });

      await request(app.getHttpServer())
        .post('/auth/admin/login')
        .send({
          phone: '13900001111',
          password: 'password123',
        })
        .expect(401);
    });
  });

  // ==================== 商品流程 ====================
  describe('Products', () => {
    const mockProduct = {
      id: 'product-1',
      name: '测试商品',
      description: '商品描述',
      images: ['https://example.com/img.jpg'],
      categoryId: 'cat-1',
      status: 'ON_SALE',
      createdAt: new Date(),
      updatedAt: new Date(),
      skus: [
        {
          id: 'sku-1',
          specs: { '规格': '标准' },
          stock: 100,
          costPrice: 10,
          prices: [
            { id: 'p1', priceType: 'RETAIL', price: 50 },
            { id: 'p2', priceType: 'AGENT_L1', price: 20 },
          ],
        },
      ],
      category: { id: 'cat-1', name: '护肤品' },
    };

    it('GET /products - 获取商品列表', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([mockProduct]);
      mockPrismaService.product.count.mockResolvedValue(1);

      const res = await request(app.getHttpServer())
        .get('/products')
        .query({ page: '1', pageSize: '10' })
        .expect(200);

      expect(res.body).toHaveProperty('items');
      expect(res.body).toHaveProperty('total', 1);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].name).toBe('测试商品');
    });

    it('GET /products/:id - 获取商品详情', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);

      const res = await request(app.getHttpServer())
        .get('/products/product-1')
        .expect(200);

      expect(res.body.id).toBe('product-1');
      expect(res.body.name).toBe('测试商品');
      expect(res.body.skus).toHaveLength(1);
    });

    it('GET /products/:id - 商品不存在返回404', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .get('/products/non-existent')
        .expect(404);
    });

    it('POST /products - 创建商品(需要管理员权限)', async () => {
      const adminUser = {
        id: 'admin-1',
        role: 'SUPER_ADMIN',
        frozen: false,
      };
      mockPrismaService.user.findUnique.mockResolvedValue(adminUser);

      const createdProduct = {
        ...mockProduct,
        id: 'product-new',
        name: '新商品',
      };
      mockPrismaService.product.create.mockResolvedValue(createdProduct);

      const token = generateToken('admin-1', 'SUPER_ADMIN');

      const res = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: '新商品',
          description: '新商品描述',
          images: ['https://example.com/new.jpg'],
          categoryId: 'cat-1',
          status: 'ON_SALE',
          skus: [
            {
              specs: { '规格': '标准' },
              stock: 50,
              costPrice: 10,
              prices: [
                { priceType: 'RETAIL', price: 50 },
                { priceType: 'AGENT_L1', price: 20 },
              ],
            },
          ],
        })
        .expect(201);

      expect(res.body.name).toBe('新商品');
      expect(mockPrismaService.product.create).toHaveBeenCalled();
    });

    it('POST /products - 无权限用户被拒绝', async () => {
      const customerUser = {
        id: 'user-1',
        role: 'CUSTOMER',
        frozen: false,
      };
      mockPrismaService.user.findUnique.mockResolvedValue(customerUser);

      const token = generateToken('user-1', 'CUSTOMER');

      await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: '新商品',
          description: '描述',
          images: ['https://example.com/img.jpg'],
          categoryId: 'cat-1',
          skus: [
            {
              specs: { '规格': '标准' },
              stock: 50,
              costPrice: 10,
              prices: [{ priceType: 'RETAIL', price: 50 }],
            },
          ],
        })
        .expect(403);
    });
  });

  // ==================== 订单流程 ====================
  describe('Orders', () => {
    const mockUser = {
      id: 'user-1',
      phone: '13900001111',
      role: 'CUSTOMER',
      memberLevel: 'BRONZE',
      frozen: false,
    };

    const mockAdminUser = {
      id: 'admin-1',
      phone: '13800000000',
      role: 'SUPER_ADMIN',
      frozen: false,
    };

    const mockOrder = {
      id: 'order-1',
      orderNo: 'ORD20260510001',
      userId: 'user-1',
      status: 'PENDING',
      totalAmount: 100,
      discountAmount: 0,
      payAmount: 100,
      createdAt: new Date(),
      items: [
        {
          id: 'item-1',
          skuId: 'sku-1',
          skuName: '测试商品',
          specs: { '规格': '标准' },
          quantity: 2,
          unitPrice: 50,
        },
      ],
    };

    it('POST /orders - 创建订单', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.sku.findMany.mockResolvedValue([
        {
          id: 'sku-1',
          stock: 100,
          costPrice: 10,
          product: { name: '测试商品', status: 'ON_SALE' },
          prices: [
            { priceType: 'MEMBER_BRONZE', price: 40 },
            { priceType: 'RETAIL', price: 50 },
          ],
        },
      ]);
      mockPrismaService.sku.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.order.create.mockResolvedValue(mockOrder);
      mockPrismaService.$transaction.mockImplementation(async (fn: any) => {
        if (typeof fn === 'function') {
          return fn(mockPrismaService);
        }
        return fn;
      });

      const token = generateToken('user-1', 'CUSTOMER');

      const res = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({
          items: [{ skuId: 'sku-1', quantity: 2 }],
          addressId: 'addr-1',
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('orderNo');
    });

    it('GET /orders - 获取订单列表', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.order.findMany.mockResolvedValue([mockOrder]);
      mockPrismaService.order.count.mockResolvedValue(1);

      const token = generateToken('user-1', 'CUSTOMER');

      const res = await request(app.getHttpServer())
        .get('/orders')
        .set('Authorization', `Bearer ${token}`)
        .query({ page: '1', pageSize: '10' })
        .expect(200);

      expect(res.body).toHaveProperty('items');
      expect(res.body).toHaveProperty('total');
      expect(res.body.items).toHaveLength(1);
    });

    it('GET /orders - 未登录用户被拒绝', async () => {
      await request(app.getHttpServer())
        .get('/orders')
        .expect(401);
    });

    it('PUT /orders/:id/ship - 发货', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockAdminUser);
      mockPrismaService.order.findUnique.mockResolvedValue({
        ...mockOrder,
        status: 'PAID',
      });
      mockPrismaService.order.update.mockResolvedValue({
        ...mockOrder,
        status: 'SHIPPED',
        expressCompany: '顺丰速运',
        expressNo: 'SF1234567890',
      });

      const token = generateToken('admin-1', 'SUPER_ADMIN');

      const res = await request(app.getHttpServer())
        .put('/orders/order-1/ship')
        .set('Authorization', `Bearer ${token}`)
        .send({
          expressCompany: '顺丰速运',
          expressNo: 'SF1234567890',
        })
        .expect(200);

      expect(res.body.status).toBe('SHIPPED');
      expect(res.body.expressCompany).toBe('顺丰速运');
      expect(res.body.expressNo).toBe('SF1234567890');
    });

    it('PUT /orders/:id/ship - 非管理员无法发货', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const token = generateToken('user-1', 'CUSTOMER');

      await request(app.getHttpServer())
        .put('/orders/order-1/ship')
        .set('Authorization', `Bearer ${token}`)
        .send({
          expressCompany: '顺丰速运',
          expressNo: 'SF1234567890',
        })
        .expect(403);
    });
  });
});
