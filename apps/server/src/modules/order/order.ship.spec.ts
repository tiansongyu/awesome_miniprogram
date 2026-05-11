import { Test, TestingModule } from '@nestjs/testing';
import { OrderService } from './order.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus } from '@prisma/client';

describe('OrderService - ship', () => {
  let service: OrderService;

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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);

    jest.clearAllMocks();
  });

  describe('ship', () => {
    it('should ship order successfully when status is PAID', async () => {
      const mockOrder = {
        id: 'order-1',
        status: OrderStatus.PAID,
      };
      const updatedOrder = {
        ...mockOrder,
        status: OrderStatus.SHIPPED,
        expressCompany: '顺丰快递',
        expressNo: 'SF1234567890',
      };

      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      mockPrisma.order.update.mockResolvedValue(updatedOrder);

      const result = await service.ship('order-1', '顺丰快递', 'SF1234567890');

      expect(result).toEqual(updatedOrder);
      expect(mockPrisma.order.findUnique).toHaveBeenCalledWith({
        where: { id: 'order-1' },
      });
      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: {
          status: OrderStatus.SHIPPED,
          expressCompany: '顺丰快递',
          expressNo: 'SF1234567890',
        },
      });
    });

    it('should throw NotFoundException when order does not exist', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);

      await expect(service.ship('non-existent', '顺丰快递', 'SF123')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when order status is not PAID', async () => {
      const mockOrder = {
        id: 'order-1',
        status: OrderStatus.PENDING,
      };
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);

      await expect(service.ship('order-1', '顺丰快递', 'SF123')).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPrisma.order.update).not.toHaveBeenCalled();
    });

    it('should save expressCompany and expressNo', async () => {
      const mockOrder = {
        id: 'order-1',
        status: OrderStatus.PAID,
      };
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      mockPrisma.order.update.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.SHIPPED,
        expressCompany: '中通快递',
        expressNo: 'ZT9876543210',
      });

      await service.ship('order-1', '中通快递', 'ZT9876543210');

      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: {
          status: OrderStatus.SHIPPED,
          expressCompany: '中通快递',
          expressNo: 'ZT9876543210',
        },
      });
    });
  });
});
