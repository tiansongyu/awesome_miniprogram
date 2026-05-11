import { Test, TestingModule } from '@nestjs/testing';
import { RefundService } from './refund.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { RefundStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

describe('RefundService', () => {
  let service: RefundService;
  let prisma: PrismaService;

  const mockPrisma = {
    order: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    refund: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefundService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<RefundService>(RefundService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('create', () => {
    const userId = 'user-1';
    const data = { orderId: 'order-1', reason: '商品质量问题' };

    it('should create a refund successfully', async () => {
      const mockOrder = {
        id: 'order-1',
        userId: 'user-1',
        status: 'PAID',
        payAmount: new Decimal(100),
      };
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      mockPrisma.refund.findFirst.mockResolvedValue(null);
      mockPrisma.refund.create.mockResolvedValue({
        id: 'refund-1',
        orderId: 'order-1',
        userId: 'user-1',
        reason: '商品质量问题',
        amount: new Decimal(100),
        status: RefundStatus.PENDING,
      });

      const result = await service.create(userId, data);

      expect(result).toEqual(
        expect.objectContaining({
          id: 'refund-1',
          orderId: 'order-1',
          status: RefundStatus.PENDING,
        }),
      );
      expect(mockPrisma.refund.create).toHaveBeenCalledWith({
        data: {
          orderId: 'order-1',
          userId: 'user-1',
          reason: '商品质量问题',
          amount: mockOrder.payAmount,
          status: RefundStatus.PENDING,
        },
      });
    });

    it('should throw BadRequestException if order does not exist', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);

      await expect(service.create(userId, data)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if order status is not PAID or SHIPPED', async () => {
      const mockOrder = {
        id: 'order-1',
        userId: 'user-1',
        status: 'PENDING',
        payAmount: new Decimal(100),
      };
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);

      await expect(service.create(userId, data)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if a pending refund already exists', async () => {
      const mockOrder = {
        id: 'order-1',
        userId: 'user-1',
        status: 'PAID',
        payAmount: new Decimal(100),
      };
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      mockPrisma.refund.findFirst.mockResolvedValue({
        id: 'refund-existing',
        status: RefundStatus.PENDING,
      });

      await expect(service.create(userId, data)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findMyRefunds', () => {
    it('should return paginated refunds for user', async () => {
      const mockRefunds = [
        { id: 'refund-1', userId: 'user-1', order: { id: 'order-1', orderNo: 'NO001', totalAmount: new Decimal(100), payAmount: new Decimal(100), status: 'PAID' } },
      ];
      mockPrisma.refund.findMany.mockResolvedValue(mockRefunds);
      mockPrisma.refund.count.mockResolvedValue(1);

      const result = await service.findMyRefunds('user-1', 1, 10);

      expect(result).toEqual({ items: mockRefunds, total: 1, page: 1, pageSize: 10 });
      expect(mockPrisma.refund.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
          skip: 0,
          take: 10,
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should return all refunds for admin', async () => {
      const mockRefunds = [
        { id: 'refund-1', order: {}, user: {} },
      ];
      mockPrisma.refund.findMany.mockResolvedValue(mockRefunds);
      mockPrisma.refund.count.mockResolvedValue(1);

      const result = await service.findAll(1, 10);

      expect(result).toEqual({ items: mockRefunds, total: 1, page: 1, pageSize: 10 });
    });

    it('should filter by status', async () => {
      mockPrisma.refund.findMany.mockResolvedValue([]);
      mockPrisma.refund.count.mockResolvedValue(0);

      await service.findAll(1, 10, RefundStatus.PENDING);

      expect(mockPrisma.refund.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: RefundStatus.PENDING },
        }),
      );
    });
  });

  describe('approve', () => {
    it('should approve a pending refund', async () => {
      const mockRefund = {
        id: 'refund-1',
        orderId: 'order-1',
        status: RefundStatus.PENDING,
      };
      mockPrisma.refund.findUnique.mockResolvedValue(mockRefund);

      const updatedRefund = {
        ...mockRefund,
        status: RefundStatus.COMPLETED,
        remark: '同意退款',
      };
      mockPrisma.$transaction.mockResolvedValue([updatedRefund, {}]);

      const result = await service.approve('refund-1', '同意退款');

      expect(result).toEqual(updatedRefund);
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should throw NotFoundException if refund does not exist', async () => {
      mockPrisma.refund.findUnique.mockResolvedValue(null);

      await expect(service.approve('refund-999')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if refund is not PENDING', async () => {
      mockPrisma.refund.findUnique.mockResolvedValue({
        id: 'refund-1',
        status: RefundStatus.COMPLETED,
      });

      await expect(service.approve('refund-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('reject', () => {
    it('should reject a pending refund', async () => {
      const mockRefund = {
        id: 'refund-1',
        orderId: 'order-1',
        status: RefundStatus.PENDING,
      };
      mockPrisma.refund.findUnique.mockResolvedValue(mockRefund);

      const updatedRefund = {
        ...mockRefund,
        status: RefundStatus.REJECTED,
        remark: '不符合退款条件',
      };
      mockPrisma.refund.update.mockResolvedValue(updatedRefund);

      const result = await service.reject('refund-1', '不符合退款条件');

      expect(result).toEqual(updatedRefund);
      expect(mockPrisma.refund.update).toHaveBeenCalledWith({
        where: { id: 'refund-1' },
        data: { status: RefundStatus.REJECTED, remark: '不符合退款条件' },
      });
    });

    it('should throw NotFoundException if refund does not exist', async () => {
      mockPrisma.refund.findUnique.mockResolvedValue(null);

      await expect(service.reject('refund-999')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if refund is not PENDING', async () => {
      mockPrisma.refund.findUnique.mockResolvedValue({
        id: 'refund-1',
        status: RefundStatus.REJECTED,
      });

      await expect(service.reject('refund-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
