import { Test, TestingModule } from '@nestjs/testing';
import { AgentService } from './agent.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Role, MemberLevel } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

describe('AgentService', () => {
  let service: AgentService;
  let prisma: PrismaService;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    settlement: {
      aggregate: jest.fn(),
    },
  };

  const mockSuperAdmin = {
    id: 'super-admin-1',
    openId: null,
    nickname: '超级管理员',
    avatar: '',
    phone: '13800000000',
    password: 'hashed',
    role: Role.SUPER_ADMIN,
    memberLevel: MemberLevel.BRONZE,
    balance: new Decimal(0),
    bindCode: 'SUPER001',
    parentAgentId: null,
    isFrozen: false,
    frozen: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAgentL1 = {
    id: 'agent-l1-1',
    openId: null,
    nickname: '一级代理',
    avatar: '',
    phone: '13800000001',
    password: 'hashed',
    role: Role.AGENT_L1,
    memberLevel: MemberLevel.BRONZE,
    balance: new Decimal(0),
    bindCode: 'AGENTL1',
    parentAgentId: 'super-admin-1',
    isFrozen: false,
    frozen: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AgentService>(AgentService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('createSubAgent', () => {
    it('should allow SUPER_ADMIN to create any level agent', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'new-agent-1',
        phone: '13900000001',
        nickname: '新代理',
        role: Role.AGENT_L1,
        bindCode: 'NEW001',
        createdAt: new Date(),
      });

      const result = await service.createSubAgent(mockSuperAdmin as any, {
        phone: '13900000001',
        nickname: '新代理',
        role: Role.AGENT_L1,
      });

      expect(result).toHaveProperty('id', 'new-agent-1');
      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            phone: '13900000001',
            role: Role.AGENT_L1,
            parentAgentId: 'super-admin-1',
          }),
        }),
      );
    });

    it('should allow AGENT_L1 to create AGENT_L2 only', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'new-agent-2',
        phone: '13900000002',
        nickname: '二级代理',
        role: Role.AGENT_L2,
        bindCode: 'NEW002',
        createdAt: new Date(),
      });

      const result = await service.createSubAgent(mockAgentL1 as any, {
        phone: '13900000002',
        nickname: '二级代理',
        role: Role.AGENT_L2,
      });

      expect(result).toHaveProperty('role', Role.AGENT_L2);
    });

    it('should throw ForbiddenException if agent tries to create wrong level', async () => {
      await expect(
        service.createSubAgent(mockAgentL1 as any, {
          phone: '13900000003',
          nickname: '一级代理',
          role: Role.AGENT_L1,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if phone already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'existing-user',
        phone: '13900000001',
      });

      await expect(
        service.createSubAgent(mockSuperAdmin as any, {
          phone: '13900000001',
          nickname: '重复手机号',
          role: Role.AGENT_L1,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getSubAgents', () => {
    it('should return paginated results', async () => {
      const mockAgents = [
        { id: 'a1', nickname: '代理1', phone: '138', role: Role.AGENT_L1, frozen: false, balance: new Decimal(0), bindCode: 'A1', createdAt: new Date(), _count: { children: 2 } },
      ];
      mockPrisma.user.findMany.mockResolvedValue(mockAgents);
      mockPrisma.user.count.mockResolvedValue(1);

      const result = await service.getSubAgents(mockSuperAdmin as any, 1, 10);

      expect(result).toEqual({
        items: mockAgents,
        total: 1,
        page: 1,
        pageSize: 10,
      });
    });

    it('should filter by role when provided', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      await service.getSubAgents(mockSuperAdmin as any, 1, 10, Role.AGENT_L1);

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            role: Role.AGENT_L1,
          }),
        }),
      );
    });

    it('should only return own sub-agents for non-SUPER_ADMIN', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      await service.getSubAgents(mockAgentL1 as any, 1, 10);

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            parentAgentId: 'agent-l1-1',
          }),
        }),
      );
    });
  });

  describe('updateAgent', () => {
    it('should update agent info successfully', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'agent-l1-1',
        parentAgentId: 'super-admin-1',
      });
      mockPrisma.user.update.mockResolvedValue({
        id: 'agent-l1-1',
        nickname: '新昵称',
        role: Role.AGENT_L1,
        frozen: false,
      });

      const result = await service.updateAgent(mockSuperAdmin as any, 'agent-l1-1', {
        nickname: '新昵称',
      });

      expect(result.nickname).toBe('新昵称');
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'agent-l1-1' },
        data: { nickname: '新昵称' },
        select: { id: true, nickname: true, role: true, frozen: true },
      });
    });

    it('should throw NotFoundException if agent does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.updateAgent(mockSuperAdmin as any, 'non-existent', { nickname: 'x' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if not own sub-agent', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'agent-other',
        parentAgentId: 'other-parent',
      });

      await expect(
        service.updateAgent(mockSuperAdmin as any, 'agent-other', { nickname: 'x' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('freezeAgent / unfreezeAgent', () => {
    it('should freeze an agent', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'agent-l1-1',
        parentAgentId: 'super-admin-1',
      });
      mockPrisma.user.update.mockResolvedValue({
        id: 'agent-l1-1',
        nickname: '一级代理',
        role: Role.AGENT_L1,
        frozen: true,
      });

      const result = await service.freezeAgent(mockSuperAdmin as any, 'agent-l1-1');

      expect(result.frozen).toBe(true);
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { frozen: true },
        }),
      );
    });

    it('should unfreeze an agent', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'agent-l1-1',
        parentAgentId: 'super-admin-1',
      });
      mockPrisma.user.update.mockResolvedValue({
        id: 'agent-l1-1',
        nickname: '一级代理',
        role: Role.AGENT_L1,
        frozen: false,
      });

      const result = await service.unfreezeAgent(mockSuperAdmin as any, 'agent-l1-1');

      expect(result.frozen).toBe(false);
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { frozen: false },
        }),
      );
    });
  });

  describe('getAgentStats', () => {
    it('should return customer count, sub-agent count, and total profit', async () => {
      mockPrisma.user.count
        .mockResolvedValueOnce(15) // customerCount
        .mockResolvedValueOnce(3); // subAgentCount
      mockPrisma.settlement.aggregate.mockResolvedValue({
        _sum: { profit: 5000 },
      });

      const result = await service.getAgentStats('agent-l1-1');

      expect(result).toEqual({
        customerCount: 15,
        subAgentCount: 3,
        totalProfit: 5000,
      });
    });

    it('should return 0 totalProfit when no settlements exist', async () => {
      mockPrisma.user.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);
      mockPrisma.settlement.aggregate.mockResolvedValue({
        _sum: { profit: null },
      });

      const result = await service.getAgentStats('agent-new');

      expect(result).toEqual({
        customerCount: 0,
        subAgentCount: 0,
        totalProfit: 0,
      });
    });
  });
});
