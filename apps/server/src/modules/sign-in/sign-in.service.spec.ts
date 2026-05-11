import { Test, TestingModule } from '@nestjs/testing';
import { SignInService } from './sign-in.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';

describe('SignInService', () => {
  let service: SignInService;

  const mockPrisma = {
    signIn: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    pointsLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SignInService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<SignInService>(SignInService);

    jest.clearAllMocks();
  });

  describe('signIn', () => {
    const userId = 'user-1';

    it('should sign in successfully for the first time', async () => {
      // 今日未签到
      mockPrisma.signIn.findUnique.mockResolvedValue(null);
      // 无历史签到记录（首次签到）
      mockPrisma.signIn.findMany.mockResolvedValue([]);

      const mockSignInRecord = { id: 'sign-1', userId, date: new Date(), points: 10 };
      mockPrisma.$transaction.mockResolvedValue([mockSignInRecord, {}, {}]);

      const result = await service.signIn(userId);

      expect(result).toEqual({
        points: 10,
        consecutiveDays: 1,
        signInRecord: mockSignInRecord,
      });
      expect(mockPrisma.signIn.findUnique).toHaveBeenCalled();
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should throw BadRequestException if already signed in today', async () => {
      // 今日已签到
      mockPrisma.signIn.findUnique.mockResolvedValue({
        id: 'sign-1',
        userId,
        date: new Date(),
        points: 10,
      });

      await expect(service.signIn(userId)).rejects.toThrow(BadRequestException);
      await expect(service.signIn(userId)).rejects.toThrow('今日已签到');
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('should increment points for consecutive sign-ins', async () => {
      // 今日未签到
      mockPrisma.signIn.findUnique.mockResolvedValue(null);

      // 模拟连续签到4天（昨天、前天、大前天、大大前天）
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const records = [];
      for (let i = 1; i <= 4; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        records.push({ date: d });
      }
      mockPrisma.signIn.findMany.mockResolvedValue(records);

      const mockSignInRecord = { id: 'sign-5', userId, date: today, points: 20 };
      mockPrisma.$transaction.mockResolvedValue([mockSignInRecord, {}, {}]);

      const result = await service.signIn(userId);

      // 连续第5天签到，积分应为20
      expect(result).toEqual({
        points: 20,
        consecutiveDays: 5,
        signInRecord: mockSignInRecord,
      });
    });
  });

  describe('getStatus', () => {
    const userId = 'user-1';

    it('should return signed status when already signed today', async () => {
      mockPrisma.signIn.findUnique.mockResolvedValue({
        id: 'sign-1',
        userId,
        date: new Date(),
        points: 10,
      });
      mockPrisma.signIn.findMany.mockResolvedValue([]);
      mockPrisma.user.findUnique.mockResolvedValue({ points: 50 });

      const result = await service.getStatus(userId);

      expect(result).toEqual({
        signedToday: true,
        consecutiveDays: 0,
        totalPoints: 50,
      });
    });

    it('should return unsigned status when not signed today', async () => {
      mockPrisma.signIn.findUnique.mockResolvedValue(null);
      mockPrisma.signIn.findMany.mockResolvedValue([]);
      mockPrisma.user.findUnique.mockResolvedValue({ points: 30 });

      const result = await service.getStatus(userId);

      expect(result).toEqual({
        signedToday: false,
        consecutiveDays: 0,
        totalPoints: 30,
      });
    });
  });

  describe('getHistory', () => {
    const userId = 'user-1';

    it('should return paginated sign-in history', async () => {
      const mockRecords = [
        { id: 'sign-2', userId, date: new Date('2026-05-10'), points: 15 },
        { id: 'sign-1', userId, date: new Date('2026-05-09'), points: 10 },
      ];
      mockPrisma.signIn.findMany.mockResolvedValue(mockRecords);
      mockPrisma.signIn.count.mockResolvedValue(2);

      const result = await service.getHistory(userId, 1, 20);

      expect(result).toEqual({
        records: mockRecords,
        total: 2,
        page: 1,
        pageSize: 20,
      });
      expect(mockPrisma.signIn.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId },
          orderBy: { date: 'desc' },
          skip: 0,
          take: 20,
        }),
      );
    });

    it('should handle pagination correctly', async () => {
      mockPrisma.signIn.findMany.mockResolvedValue([]);
      mockPrisma.signIn.count.mockResolvedValue(25);

      const result = await service.getHistory(userId, 2, 10);

      expect(result).toEqual({
        records: [],
        total: 25,
        page: 2,
        pageSize: 10,
      });
      expect(mockPrisma.signIn.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        }),
      );
    });
  });
});
