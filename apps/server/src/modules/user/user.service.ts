import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { Role, MemberLevel } from '@prisma/client';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        nickname: true,
        avatar: true,
        phone: true,
        role: true,
        memberLevel: true,
        balance: true,
        bindCode: true,
        createdAt: true,
      },
    });
    if (!user) throw new NotFoundException('用户不存在');
    return user;
  }

  async updateProfile(userId: string, dto: UpdateUserDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: dto,
      select: {
        id: true,
        nickname: true,
        avatar: true,
        phone: true,
        role: true,
        memberLevel: true,
      },
    });
  }

  async listCustomers(agentId: string, page: number, pageSize: number) {
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where: { parentAgentId: agentId, role: Role.CUSTOMER },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          nickname: true,
          avatar: true,
          memberLevel: true,
          createdAt: true,
        },
      }),
      this.prisma.user.count({
        where: { parentAgentId: agentId, role: Role.CUSTOMER },
      }),
    ]);
    return { items, total, page, pageSize };
  }

  // ========== Admin user management ==========

  async listUsers(page: number, pageSize: number, role?: Role) {
    const where = role ? { role } : {};
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          nickname: true,
          avatar: true,
          phone: true,
          role: true,
          memberLevel: true,
          frozen: true,
          balance: true,
          createdAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async getUserDetail(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        nickname: true,
        avatar: true,
        phone: true,
        role: true,
        memberLevel: true,
        balance: true,
        bindCode: true,
        frozen: true,
        parentAgentId: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { children: true, orders: true },
        },
      },
    });
    if (!user) throw new NotFoundException('用户不存在');
    return user;
  }

  async updateUserRole(userId: string, role: Role) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('用户不存在');
    return this.prisma.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, nickname: true, role: true },
    });
  }

  async updateMemberLevel(userId: string, memberLevel: MemberLevel) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('用户不存在');
    return this.prisma.user.update({
      where: { id: userId },
      data: { memberLevel },
      select: { id: true, nickname: true, memberLevel: true },
    });
  }

  async freezeUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('用户不存在');
    return this.prisma.user.update({
      where: { id: userId },
      data: { frozen: true },
      select: { id: true, nickname: true, frozen: true },
    });
  }

  async unfreezeUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('用户不存在');
    return this.prisma.user.update({
      where: { id: userId },
      data: { frozen: false },
      select: { id: true, nickname: true, frozen: true },
    });
  }
}
