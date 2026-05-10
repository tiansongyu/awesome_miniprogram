import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { Role } from '@prisma/client';

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
}
