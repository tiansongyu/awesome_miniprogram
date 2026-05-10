import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis/redis.service';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;

  const mockPrisma = {
    user: { findUnique: jest.fn(), create: jest.fn() },
  };
  const mockJwt = { sign: jest.fn().mockReturnValue('mock-token') };
  const mockConfig = {
    get: jest.fn((key: string) => {
      const map: Record<string, string> = {
        'jwt.secret': 'secret',
        'jwt.expiresIn': '15m',
        'jwt.refreshExpiresIn': '7d',
      };
      return map[key];
    }),
  };
  const mockRedis = { set: jest.fn(), get: jest.fn(), del: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: mockConfig },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('adminLogin', () => {
    it('should throw if user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(
        service.adminLogin({ phone: '123', password: 'pass' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw if password wrong', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: '1',
        phone: '123',
        password: await bcrypt.hash('other', 10),
        role: Role.SUPER_ADMIN,
      });
      await expect(
        service.adminLogin({ phone: '123', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return tokens on success', async () => {
      const hashed = await bcrypt.hash('correct', 10);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: '1',
        phone: '123',
        password: hashed,
        role: Role.SUPER_ADMIN,
      });
      const result = await service.adminLogin({ phone: '123', password: 'correct' });
      expect(result.accessToken).toBe('mock-token');
      expect(result.refreshToken).toBeDefined();
    });
  });
});
