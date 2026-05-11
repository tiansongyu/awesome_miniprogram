import { Test, TestingModule } from '@nestjs/testing';
import { CouponService } from './coupon.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CouponStatus, CouponType, UserCouponStatus } from '@prisma/client';

describe('CouponService', () => {
  let service: CouponService;

  const mockPrisma = {
    coupon: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    userCoupon: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CouponService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<CouponService>(CouponService);

    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a coupon', async () => {
      const dto = {
        name: '满100减10',
        type: CouponType.FIXED,
        value: 10,
        minAmount: 100,
        totalCount: 500,
        startTime: '2026-05-01T00:00:00Z',
        endTime: '2026-06-01T00:00:00Z',
      };

      const mockCoupon = {
        id: 'coupon-1',
        ...dto,
        startTime: new Date(dto.startTime),
        endTime: new Date(dto.endTime),
        usedCount: 0,
        status: CouponStatus.ACTIVE,
        createdAt: new Date(),
      };

      mockPrisma.coupon.create.mockResolvedValue(mockCoupon);

      const result = await service.create(dto);

      expect(result).toEqual(mockCoupon);
      expect(mockPrisma.coupon.create).toHaveBeenCalledWith({
        data: {
          name: dto.name,
          type: dto.type,
          value: dto.value,
          minAmount: dto.minAmount,
          totalCount: dto.totalCount,
          startTime: new Date(dto.startTime),
          endTime: new Date(dto.endTime),
        },
      });
    });

    it('should default minAmount to 0 when not provided', async () => {
      const dto = {
        name: '9折券',
        type: CouponType.PERCENT,
        value: 90,
        totalCount: 100,
        startTime: '2026-05-01T00:00:00Z',
        endTime: '2026-06-01T00:00:00Z',
      };

      mockPrisma.coupon.create.mockResolvedValue({ id: 'coupon-2', ...dto });

      await service.create(dto);

      expect(mockPrisma.coupon.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ minAmount: 0 }),
      });
    });
  });

  describe('findAll', () => {
    it('should return paginated coupons', async () => {
      const mockList = [
        { id: 'coupon-1', name: '满100减10' },
        { id: 'coupon-2', name: '9折券' },
      ];
      mockPrisma.coupon.findMany.mockResolvedValue(mockList);
      mockPrisma.coupon.count.mockResolvedValue(2);

      const result = await service.findAll({ page: 1, pageSize: 10 });

      expect(result).toEqual({ list: mockList, total: 2, page: 1, pageSize: 10 });
      expect(mockPrisma.coupon.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter by status', async () => {
      mockPrisma.coupon.findMany.mockResolvedValue([]);
      mockPrisma.coupon.count.mockResolvedValue(0);

      await service.findAll({ status: CouponStatus.ACTIVE });

      expect(mockPrisma.coupon.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: CouponStatus.ACTIVE },
        }),
      );
    });

    it('should use default page and pageSize when not provided', async () => {
      mockPrisma.coupon.findMany.mockResolvedValue([]);
      mockPrisma.coupon.count.mockResolvedValue(0);

      await service.findAll();

      expect(mockPrisma.coupon.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 10,
        }),
      );
    });
  });

  describe('update', () => {
    it('should update a coupon', async () => {
      const existingCoupon = {
        id: 'coupon-1',
        name: '满100减10',
        status: CouponStatus.ACTIVE,
      };
      mockPrisma.coupon.findUnique.mockResolvedValue(existingCoupon);

      const dto = { name: '满200减20', value: 20 };
      const updatedCoupon = { ...existingCoupon, ...dto };
      mockPrisma.coupon.update.mockResolvedValue(updatedCoupon);

      const result = await service.update('coupon-1', dto);

      expect(result).toEqual(updatedCoupon);
      expect(mockPrisma.coupon.update).toHaveBeenCalledWith({
        where: { id: 'coupon-1' },
        data: {
          name: '满200减20',
          value: 20,
          startTime: undefined,
          endTime: undefined,
        },
      });
    });

    it('should throw NotFoundException when coupon does not exist', async () => {
      mockPrisma.coupon.findUnique.mockResolvedValue(null);

      await expect(service.update('non-existent', { name: 'test' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should convert date strings when updating times', async () => {
      mockPrisma.coupon.findUnique.mockResolvedValue({ id: 'coupon-1' });
      mockPrisma.coupon.update.mockResolvedValue({ id: 'coupon-1' });

      const dto = {
        startTime: '2026-07-01T00:00:00Z',
        endTime: '2026-08-01T00:00:00Z',
      };

      await service.update('coupon-1', dto);

      expect(mockPrisma.coupon.update).toHaveBeenCalledWith({
        where: { id: 'coupon-1' },
        data: expect.objectContaining({
          startTime: new Date('2026-07-01T00:00:00Z'),
          endTime: new Date('2026-08-01T00:00:00Z'),
        }),
      });
    });
  });

  describe('claim', () => {
    const activeCoupon = {
      id: 'coupon-1',
      name: '满100减10',
      status: CouponStatus.ACTIVE,
      startTime: new Date('2026-01-01'),
      endTime: new Date('2026-12-31'),
      totalCount: 100,
      usedCount: 50,
    };

    it('should allow user to claim a coupon successfully', async () => {
      mockPrisma.coupon.findUnique.mockResolvedValue(activeCoupon);
      mockPrisma.userCoupon.findFirst.mockResolvedValue(null);

      const mockUserCoupon = {
        id: 'uc-1',
        userId: 'user-1',
        couponId: 'coupon-1',
        status: UserCouponStatus.UNUSED,
      };
      mockPrisma.userCoupon.create.mockResolvedValue(mockUserCoupon);
      mockPrisma.coupon.update.mockResolvedValue({});
      mockPrisma.$transaction.mockImplementation((args) => Promise.resolve(args));

      const result = await service.claim('coupon-1', 'user-1');

      expect(result).toEqual(mockUserCoupon);
      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockPrisma.userCoupon.create).toHaveBeenCalledWith({
        data: { userId: 'user-1', couponId: 'coupon-1' },
      });
      expect(mockPrisma.coupon.update).toHaveBeenCalledWith({
        where: { id: 'coupon-1' },
        data: { usedCount: { increment: 1 } },
      });
    });

    it('should throw NotFoundException when coupon does not exist', async () => {
      mockPrisma.coupon.findUnique.mockResolvedValue(null);

      await expect(service.claim('non-existent', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when coupon is not active', async () => {
      mockPrisma.coupon.findUnique.mockResolvedValue({
        ...activeCoupon,
        status: CouponStatus.INACTIVE,
      });

      await expect(service.claim('coupon-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when coupon is expired', async () => {
      mockPrisma.coupon.findUnique.mockResolvedValue({
        ...activeCoupon,
        startTime: new Date('2020-01-01'),
        endTime: new Date('2020-12-31'),
      });

      await expect(service.claim('coupon-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when coupon stock is exhausted', async () => {
      mockPrisma.coupon.findUnique.mockResolvedValue({
        ...activeCoupon,
        usedCount: 100,
        totalCount: 100,
      });

      await expect(service.claim('coupon-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when user already claimed', async () => {
      mockPrisma.coupon.findUnique.mockResolvedValue(activeCoupon);
      mockPrisma.userCoupon.findFirst.mockResolvedValue({
        id: 'uc-existing',
        userId: 'user-1',
        couponId: 'coupon-1',
      });

      await expect(service.claim('coupon-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findMyCoupons', () => {
    it('should return all user coupons', async () => {
      const mockCoupons = [
        { id: 'uc-1', userId: 'user-1', coupon: { name: '满100减10' } },
        { id: 'uc-2', userId: 'user-1', coupon: { name: '9折券' } },
      ];
      mockPrisma.userCoupon.findMany.mockResolvedValue(mockCoupons);

      const result = await service.findMyCoupons('user-1');

      expect(result).toEqual(mockCoupons);
      expect(mockPrisma.userCoupon.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        include: { coupon: true },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter by status when provided', async () => {
      mockPrisma.userCoupon.findMany.mockResolvedValue([]);

      await service.findMyCoupons('user-1', UserCouponStatus.UNUSED);

      expect(mockPrisma.userCoupon.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', status: UserCouponStatus.UNUSED },
        include: { coupon: true },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter by USED status', async () => {
      mockPrisma.userCoupon.findMany.mockResolvedValue([]);

      await service.findMyCoupons('user-1', UserCouponStatus.USED);

      expect(mockPrisma.userCoupon.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', status: UserCouponStatus.USED },
        include: { coupon: true },
        orderBy: { createdAt: 'desc' },
      });
    });
  });
});
