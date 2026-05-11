import { Test, TestingModule } from '@nestjs/testing';
import { ReviewService } from './review.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

describe('ReviewService', () => {
  let service: ReviewService;

  const mockPrisma = {
    order: {
      findUnique: jest.fn(),
    },
    orderItem: {
      findFirst: jest.fn(),
    },
    review: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ReviewService>(ReviewService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    const userId = 'user-1';
    const createData = {
      orderId: 'order-1',
      productId: 'product-1',
      rating: 5,
      content: '非常好',
      images: ['img1.jpg'],
    };

    const mockOrder = {
      id: 'order-1',
      userId: 'user-1',
      status: 'COMPLETED',
      items: [{ skuId: 'product-1' }],
    };

    it('成功提交评价', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      mockPrisma.review.findUnique.mockResolvedValue(null);
      const createdReview = {
        id: 'review-1',
        userId,
        orderId: createData.orderId,
        productId: createData.productId,
        rating: createData.rating,
        content: createData.content,
        images: createData.images,
      };
      mockPrisma.review.create.mockResolvedValue(createdReview);

      const result = await service.create(userId, createData);

      expect(result).toEqual(createdReview);
      expect(mockPrisma.review.create).toHaveBeenCalledWith({
        data: {
          userId,
          orderId: createData.orderId,
          productId: createData.productId,
          rating: createData.rating,
          content: createData.content,
          images: createData.images,
        },
      });
    });

    it('订单未完成不能评价', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        ...mockOrder,
        status: 'PAID',
      });

      await expect(service.create(userId, createData)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(userId, createData)).rejects.toThrow(
        '只能评价已完成的订单',
      );
    });

    it('重复评价抛异常', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      mockPrisma.review.findUnique.mockResolvedValue({
        id: 'existing-review',
        userId,
        orderId: createData.orderId,
        productId: createData.productId,
      });

      await expect(service.create(userId, createData)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(userId, createData)).rejects.toThrow(
        '该商品已评价',
      );
    });
  });

  describe('listByProduct', () => {
    it('获取商品评价列表', async () => {
      const mockReviews = [
        {
          id: 'review-1',
          productId: 'product-1',
          rating: 5,
          content: '好评',
          user: { id: 'user-1', nickname: '张三', avatar: '' },
        },
        {
          id: 'review-2',
          productId: 'product-1',
          rating: 4,
          content: '不错',
          user: { id: 'user-2', nickname: '李四', avatar: '' },
        },
      ];
      mockPrisma.review.findMany.mockResolvedValue(mockReviews);
      mockPrisma.review.count.mockResolvedValue(2);

      const result = await service.listByProduct('product-1', 1, 10);

      expect(result).toEqual({
        items: mockReviews,
        total: 2,
        page: 1,
        pageSize: 10,
      });
      expect(mockPrisma.review.findMany).toHaveBeenCalledWith({
        where: { productId: 'product-1' },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10,
        include: {
          user: { select: { id: true, nickname: true, avatar: true } },
        },
      });
    });
  });

  describe('listByUser', () => {
    it('获取我的评价列表', async () => {
      const mockReviews = [
        {
          id: 'review-1',
          userId: 'user-1',
          rating: 5,
          content: '好评',
          product: { id: 'product-1', name: '商品A', images: ['img.jpg'] },
        },
      ];
      mockPrisma.review.findMany.mockResolvedValue(mockReviews);
      mockPrisma.review.count.mockResolvedValue(1);

      const result = await service.listByUser('user-1', 1, 10);

      expect(result).toEqual({
        items: mockReviews,
        total: 1,
        page: 1,
        pageSize: 10,
      });
      expect(mockPrisma.review.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10,
        include: {
          product: { select: { id: true, name: true, images: true } },
        },
      });
    });
  });
});
