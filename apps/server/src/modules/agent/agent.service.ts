import {
  Injectable,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Role, User } from '@prisma/client';
import { CreateAgentDto, UpdateAgentDto } from './dto/create-agent.dto';
import * as bcrypt from 'bcrypt';
import { generateBindCode } from '@agent-saler/utils';

const ROLE_HIERARCHY: Record<string, Role> = {
  SUPER_ADMIN: Role.AGENT_L1,
  AGENT_L1: Role.AGENT_L2,
  AGENT_L2: Role.AGENT_L3,
};

@Injectable()
export class AgentService {
  constructor(private prisma: PrismaService) {}

  async createSubAgent(currentUser: User, dto: CreateAgentDto) {
    const allowedChildRole = ROLE_HIERARCHY[currentUser.role];
    if (!allowedChildRole || dto.role !== allowedChildRole) {
      throw new ForbiddenException('无权创建该级别代理');
    }

    const existing = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });
    if (existing) {
      throw new BadRequestException('该手机号已注册');
    }

    const hashedPassword = dto.password
      ? await bcrypt.hash(dto.password, 10)
      : await bcrypt.hash('123456', 10);

    return this.prisma.user.create({
      data: {
        phone: dto.phone,
        nickname: dto.nickname,
        password: hashedPassword,
        role: dto.role,
        parentAgentId: currentUser.id,
        bindCode: generateBindCode(),
      },
      select: {
        id: true,
        phone: true,
        nickname: true,
        role: true,
        bindCode: true,
        createdAt: true,
      },
    });
  }

  async getSubAgents(currentUser: User, page: number, pageSize: number) {
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where: {
          parentAgentId: currentUser.id,
          role: { not: Role.CUSTOMER },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          nickname: true,
          phone: true,
          role: true,
          frozen: true,
          balance: true,
          bindCode: true,
          createdAt: true,
          _count: { select: { children: true } },
        },
      }),
      this.prisma.user.count({
        where: {
          parentAgentId: currentUser.id,
          role: { not: Role.CUSTOMER },
        },
      }),
    ]);
    return { items, total, page, pageSize };
  }

  async getAgentTree(currentUser: User) {
    const agents = await this.prisma.user.findMany({
      where: { parentAgentId: currentUser.id },
      select: {
        id: true,
        nickname: true,
        role: true,
        frozen: true,
        children: {
          select: {
            id: true,
            nickname: true,
            role: true,
            frozen: true,
            children: {
              select: {
                id: true,
                nickname: true,
                role: true,
                frozen: true,
              },
            },
          },
        },
      },
    });
    return agents;
  }

  async updateAgent(currentUser: User, agentId: string, dto: UpdateAgentDto) {
    const agent = await this.prisma.user.findUnique({
      where: { id: agentId },
    });
    if (!agent) throw new NotFoundException('代理不存在');
    if (agent.parentAgentId !== currentUser.id) {
      throw new ForbiddenException('只能管理自己的下级');
    }

    return this.prisma.user.update({
      where: { id: agentId },
      data: dto,
      select: {
        id: true,
        nickname: true,
        role: true,
        frozen: true,
      },
    });
  }

  async freezeAgent(currentUser: User, agentId: string) {
    return this.updateAgent(currentUser, agentId, { frozen: true });
  }

  async unfreezeAgent(currentUser: User, agentId: string) {
    return this.updateAgent(currentUser, agentId, { frozen: false });
  }

  async getAgentStats(agentId: string) {
    const [customerCount, subAgentCount, totalProfit] = await Promise.all([
      this.prisma.user.count({
        where: { parentAgentId: agentId, role: Role.CUSTOMER },
      }),
      this.prisma.user.count({
        where: { parentAgentId: agentId, role: { not: Role.CUSTOMER } },
      }),
      this.prisma.settlement.aggregate({
        where: { agentId },
        _sum: { profit: true },
      }),
    ]);

    return {
      customerCount,
      subAgentCount,
      totalProfit: totalProfit._sum.profit || 0,
    };
  }
}
