import { Test, TestingModule } from '@nestjs/testing';
import { OrderService } from './order.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { OrderStatus, Role, MemberLevel, PriceType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

describe('OrderService', () => {
  let service: OrderService;
  let prisma: PrismaService;

  const mockPrisma = {
    sku: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
    },
    order: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockUser = {
    id: 'user-1',
    openId: 'open-1',
    nickname: '测试用户',
    avatar: '',
    phone: '13800000000',
    password: null,
    role: Role.CUSTOMER,
    memberLevel: MemberLevel.BRONZE,
    balance: new Decimal(0),
    points: 0,
    bindCode: 'CODE1',
    parentAgentId: 'agent-1',
    isFrozen: false,
    frozen: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('create', () => {
    const createOrderDto = {
      items: [
        { skuId: 'sku-1', quantity: 2 },
        { skuId: 'sku-2', quantity: 1 },
      ],
      remark: '测试订单',
    };

    const mockSkus = [
      {
        id: 'sku-1',
        stock: 100,
        costPrice: new Decimal(10),
        product: { name: '商品A', status: 'ON_SALE' },
        prices: [{ priceType: PriceType.MEMBER_BRONZE, price: new Decimal(15) }],
      },
      {
        id: 'sku-2',
        stock: 50,
        costPrice: new Decimal(20),
        product: { name: '商品B', status: 'ON_SALE' },
        prices: [{ priceType: PriceType.MEMBER_BRONZE, price: new Decimal(25) }],
      },
    ];

    it('should create an order with correct price calculation and stock deduction', async () => {
      mockPrisma.sku.findMany.mockResolvedValue(mockSkus);

      const mockOrder = {
        id: 'order-1',
        orderNo: 'ORD20260101001',
        userId: mockUser.id,
        totalAmount: new Decimal(55), // 15*2 + 25*1
        status: OrderStatus.PENDING,
        items: [],
      };

      mockPrisma.$transaction.mockImplementation(async (cb) => {
        const tx = {
          sku: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
          order: { create: jest.fn().mockResolvedValue(mockOrder) },
        };
        return cb(tx);
      });

      const result = await service.create(mockUser, createOrderDto);

      expect(result).toEqual(mockOrder);
      expect(mockPrisma.sku.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['sku-1', 'sku-2'] } },
        include: {
          prices: true,
          product: { select: { name: true, status: true } },
        },
      });
    });

    it('should throw BadRequestException if sku not found', async () => {
      mockPrisma.sku.findMany.mockResolvedValue([mockSkus[0]]);

      await expect(service.create(mockUser, createOrderDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if product is off sale', async () => {
      const offSaleSkus = [
        { ...mockSkus[0], product: { name: '商品A', status: 'OFF_SALE' } },
        mockSkus[1],
      ];
      mockPrisma.sku.findMany.mockResolvedValue(offSaleSkus);

      await expect(service.create(mockUser, createOrderDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if stock is insufficient', async () => {
      const lowStockSkus = [
        { ...mockSkus[0], stock: 1 },
        mockSkus[1],
      ];
      mockPrisma.sku.findMany.mockResolvedValue(lowStockSkus);

      await expect(service.create(mockUser, createOrderDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should use agent price for agent user', async () => {
      const agentUser = { ...mockUser, role: Role.AGENT_L1 };
      const agentSkus = [
        {
          ...mockSkus[0],
          prices: [
            { priceType: PriceType.AGENT_L1, price: new Decimal(8) },
            { priceType: PriceType.MEMBER_BRONZE, price: new Decimal(15) },
          ],
        },
        {
          ...mockSkus[1],
          prices: [
            { priceType: PriceType.AGENT_L1, price: new Decimal(18) },
            { priceType: PriceType.MEMBER_BRONZE, price: new Decimal(25) },
          ],
        },
      ];
      mockPrisma.sku.findMany.mockResolvedValue(agentSkus);

      const mockOrder = {
        id: 'order-2',
        orderNo: 'ORD20260101002',
        userId: agentUser.id,
        totalAmount: new Decimal(34), // 8*2 + 18*1
        status: OrderStatus.PENDING,
        items: [],
      };

      mockPrisma.$transaction.mockImplementation(async (cb) => {
        const tx = {
          sku: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
          order: { create: jest.fn().mockResolvedValue(mockOrder) },
        };
        return cb(tx);
      });

      const result = await service.create(agentUser, createOrderDto);
      expect(result).toEqual(mockOrder);
    });
  });

  describe('findByUser', () => {
    it('should return paginated orders for user', async () => {
      const mockOrders = [
        { id: 'order-1', orderNo: 'ORD001', items: [] },
        { id: 'order-2', orderNo: 'ORD002', items: [] },
      ];
      mockPrisma.order.findMany.mockResolvedValue(mockOrders);
      mockPrisma.order.count.mockResolvedValue(2);

      const result = await service.findByUser('user-1', undefined, 1, 20);

      expect(result).toEqual({ items: mockOrders, total: 2, page: 1, pageSize: 20 });
      expect(mockPrisma.order.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: { items: true },
      });
    });

    it('should filter by status', async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);
      mockPrisma.order.count.mockResolvedValue(0);

      await service.findByUser('user-1', OrderStatus.PENDING, 1, 10);

      expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1', status: OrderStatus.PENDING },
        }),
      );
    });

    it('should handle pagination correctly', async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);
      mockPrisma.order.count.mockResolvedValue(50);

      const result = await service.findByUser('user-1', undefined, 3, 10);

      expect(result.page).toBe(3);
      expect(result.pageSize).toBe(10);
      expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      );
    });
  });

  describe('findById', () => {
    it('should return order detail', async () => {
      const mockOrder = {
        id: 'order-1',
        userId: 'user-1',
        items: [],
        settlements: [],
      };
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);

      const result = await service.findById('order-1', 'user-1');

      expect(result).toEqual(mockOrder);
      expect(mockPrisma.order.findUnique).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        include: { items: true, settlements: true, refunds: true },
      });
    });

    it('should throw NotFoundException if order not found', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);

      await expect(service.findById('non-existent', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if user does not own the order', async () => {
      const mockOrder = {
        id: 'order-1',
        userId: 'user-other',
        items: [],
        settlements: [],
      };
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);

      await expect(service.findById('order-1', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('updateStatus', () => {
    it('should update order status to PAID', async () => {
      const updatedOrder = { id: 'order-1', status: OrderStatus.PAID };
      mockPrisma.order.update.mockResolvedValue(updatedOrder);

      const result = await service.updateStatus('order-1', OrderStatus.PAID);

      expect(result).toEqual(updatedOrder);
      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: { status: OrderStatus.PAID },
      });
    });

    it('should update order status to SHIPPED', async () => {
      const updatedOrder = { id: 'order-1', status: OrderStatus.SHIPPED };
      mockPrisma.order.update.mockResolvedValue(updatedOrder);

      const result = await service.updateStatus('order-1', OrderStatus.SHIPPED);

      expect(result).toEqual(updatedOrder);
    });

    it('should update order status to COMPLETED', async () => {
      const updatedOrder = { id: 'order-1', status: OrderStatus.COMPLETED };
      mockPrisma.order.update.mockResolvedValue(updatedOrder);

      const result = await service.updateStatus('order-1', OrderStatus.COMPLETED);

      expect(result).toEqual(updatedOrder);
    });
  });

  describe('cancelOrder', () => {
    it('should cancel a pending order and restore stock', async () => {
      const mockOrder = {
        id: 'order-1',
        userId: 'user-1',
        status: OrderStatus.PENDING,
        items: [
          { skuId: 'sku-1', quantity: 2 },
          { skuId: 'sku-2', quantity: 1 },
        ],
      };
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);

      mockPrisma.$transaction.mockImplementation(async (cb) => {
        const tx = {
          sku: { update: jest.fn().mockResolvedValue({}) },
          order: { update: jest.fn().mockResolvedValue({}) },
        };
        return cb(tx);
      });

      const result = await service.cancelOrder('order-1', 'user-1');

      expect(result).toEqual({ success: true });
    });

    it('should throw NotFoundException if order not found', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);

      await expect(service.cancelOrder('non-existent', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if user does not own the order', async () => {
      const mockOrder = {
        id: 'order-1',
        userId: 'user-other',
        status: OrderStatus.PENDING,
        items: [],
      };
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);

      await expect(service.cancelOrder('order-1', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw BadRequestException if order is not pending', async () => {
      const mockOrder = {
        id: 'order-1',
        userId: 'user-1',
        status: OrderStatus.PAID,
        items: [],
      };
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);

      await expect(service.cancelOrder('order-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('adminFindAll', () => {
    it('should return paginated orders for admin', async () => {
      const mockOrders = [{ id: 'order-1', items: [], user: { id: 'u1', nickname: 'test', phone: '138' } }];
      mockPrisma.order.findMany.mockResolvedValue(mockOrders);
      mockPrisma.order.count.mockResolvedValue(1);

      const result = await service.adminFindAll({ page: 1, pageSize: 10 });

      expect(result).toEqual({ items: mockOrders, total: 1, page: 1, pageSize: 10 });
    });

    it('should filter by status for admin', async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);
      mockPrisma.order.count.mockResolvedValue(0);

      await service.adminFindAll({ status: OrderStatus.PAID });

      expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: OrderStatus.PAID },
        }),
      );
    });
  });
});
