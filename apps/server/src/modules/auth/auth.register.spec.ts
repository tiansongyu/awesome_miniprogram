import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis/redis.service';
import { ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Role, MemberLevel } from '@prisma/client';

describe('AuthService - register', () => {
  let service: AuthService;
  let prisma: PrismaService;

  const mockPrisma = {
    user: { findUnique: jest.fn(), create: jest.fn() },
  };
  const mockJwt = { sign: jest.fn().mockReturnValue('mock-access-token') };
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

    jest.clearAllMocks();
  });

  it('should register a new user successfully', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue({
      id: 'user-1',
      phone: '13800000001',
      role: Role.CUSTOMER,
      memberLevel: MemberLevel.BRONZE,
    });

    const result = await service.register({
      phone: '13800000001',
      password: '123456',
      nickname: '新用户',
    });

    expect(mockPrisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        phone: '13800000001',
        role: Role.CUSTOMER,
        memberLevel: MemberLevel.BRONZE,
        nickname: '新用户',
      }),
    });
    expect(result).toHaveProperty('accessToken');
    expect(result).toHaveProperty('refreshToken');
  });

  it('should throw ConflictException if phone already exists', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'existing-user',
      phone: '13800000001',
    });

    await expect(
      service.register({ phone: '13800000001', password: '123456' }),
    ).rejects.toThrow(ConflictException);
  });

  it('should set parentAgentId when valid bindCode is provided', async () => {
    // First call: check phone uniqueness -> null
    // Second call: find agent by bindCode -> agent found
    mockPrisma.user.findUnique
      .mockResolvedValueOnce(null) // phone check
      .mockResolvedValueOnce({ id: 'agent-1', bindCode: 'ABCD1234' }); // bindCode lookup

    mockPrisma.user.create.mockResolvedValue({
      id: 'user-2',
      phone: '13800000002',
      role: Role.CUSTOMER,
      parentAgentId: 'agent-1',
    });

    await service.register({
      phone: '13800000002',
      password: '123456',
      bindCode: 'ABCD1234',
    });

    expect(mockPrisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        parentAgentId: 'agent-1',
      }),
    });
  });

  it('should ignore invalid bindCode without throwing error', async () => {
    // First call: check phone -> null
    // Second call: find agent by bindCode -> null (not found)
    mockPrisma.user.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    mockPrisma.user.create.mockResolvedValue({
      id: 'user-3',
      phone: '13800000003',
      role: Role.CUSTOMER,
    });

    await expect(
      service.register({
        phone: '13800000003',
        password: '123456',
        bindCode: 'INVALID_CODE',
      }),
    ).resolves.toBeDefined();

    expect(mockPrisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        parentAgentId: undefined,
      }),
    });
  });

  it('should return accessToken and refreshToken', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue({
      id: 'user-4',
      phone: '13800000004',
      role: Role.CUSTOMER,
    });

    const result = await service.register({
      phone: '13800000004',
      password: '123456',
    });

    expect(result.accessToken).toBe('mock-access-token');
    expect(typeof result.refreshToken).toBe('string');
    expect(result.refreshToken.length).toBeGreaterThan(0);
  });
});
