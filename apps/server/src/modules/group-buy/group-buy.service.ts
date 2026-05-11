import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { InitiateGroupDto, JoinGroupDto } from './dto/join-group.dto';

@Injectable()
export class GroupBuyService {
  constructor(private prisma: PrismaService) {}

  async createActivity(dto: CreateActivityDto) {
    return this.prisma.groupBuyActivity.create({
      data: {
        productId: dto.productId,
        skuId: dto.skuId,
        groupPrice: dto.groupPrice,
        groupSize: dto.groupSize || 2,
        duration: dto.duration || 24,
        maxGroups: dto.maxGroups || 0,
        startTime: new Date(dto.startTime),
        endTime: new Date(dto.endTime),
      },
      include: { product: true, sku: true },
    });
  }

  async listActivities(page = 1, pageSize = 20) {
    const now = new Date();
    const where = {
      status: 'ACTIVE',
      startTime: { lte: now },
      endTime: { gte: now },
    };
    const [items, total] = await Promise.all([
      this.prisma.groupBuyActivity.findMany({
        where,
        include: {
          product: { include: { skus: { include: { prices: true } } } },
          sku: { include: { prices: true } },
          groups: { where: { status: 'PENDING' }, include: { members: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.groupBuyActivity.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async getActivity(id: string) {
    return this.prisma.groupBuyActivity.findUnique({
      where: { id },
      include: {
        product: { include: { skus: { include: { prices: true } } } },
        sku: { include: { prices: true } },
        groups: {
          where: { status: 'PENDING' },
          include: {
            members: { include: { user: { select: { id: true, nickname: true, avatar: true } } } },
            leader: { select: { id: true, nickname: true, avatar: true } },
          },
        },
      },
    });
  }

  async initiateGroup(userId: string, dto: InitiateGroupDto) {
    const activity = await this.prisma.groupBuyActivity.findUnique({
      where: { id: dto.activityId },
      include: { sku: true },
    });
    if (!activity) throw new Error('活动不存在');
    if (activity.status !== 'ACTIVE') throw new Error('活动已结束');
    if (new Date() > activity.endTime) throw new Error('活动已过期');

    return this.prisma.$transaction(async (tx) => {
      // Check stock
      const sku = await tx.sku.findUnique({ where: { id: activity.skuId } });
      if (!sku || sku.stock < 1) throw new Error('库存不足');

      // Decrement stock
      await tx.sku.update({
        where: { id: activity.skuId },
        data: { stock: { decrement: 1 } },
      });

      // Create order
      const orderNo = `GRP${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      const order = await tx.order.create({
        data: {
          orderNo,
          userId,
          totalAmount: activity.groupPrice,
          payAmount: activity.groupPrice,
          status: 'GROUPING',
          addressName: dto.addressName,
          addressPhone: dto.addressPhone,
          addressDetail: dto.addressDetail,
          items: {
            create: {
              skuId: activity.skuId,
              skuName: (activity.sku?.specs as any)?.name || '拼团商品',
              specs: activity.sku?.specs || {},
              quantity: 1,
              unitPrice: activity.groupPrice,
            },
          },
        },
      });

      // Create group
      const expireAt = new Date(Date.now() + activity.duration * 3600 * 1000);
      const group = await tx.groupBuyGroup.create({
        data: {
          activityId: activity.id,
          leaderId: userId,
          expireAt,
          members: {
            create: { userId, orderId: order.id },
          },
        },
        include: { members: true },
      });

      return { group, order };
    });
  }

  async joinGroup(userId: string, dto: JoinGroupDto) {
    const group = await this.prisma.groupBuyGroup.findUnique({
      where: { id: dto.groupId },
      include: { activity: { include: { sku: true } }, members: true },
    });
    if (!group) throw new Error('拼团不存在');
    if (group.status !== 'PENDING') throw new Error('拼团已结束');
    if (new Date() > group.expireAt) throw new Error('拼团已过期');
    if (group.members.length >= group.activity.groupSize) throw new Error('拼团已满');
    if (group.members.some((m) => m.userId === userId)) throw new Error('已参与该拼团');

    const activity = group.activity;

    return this.prisma.$transaction(async (tx) => {
      // Check stock
      const sku = await tx.sku.findUnique({ where: { id: activity.skuId } });
      if (!sku || sku.stock < 1) throw new Error('库存不足');

      // Decrement stock
      await tx.sku.update({
        where: { id: activity.skuId },
        data: { stock: { decrement: 1 } },
      });

      // Create order
      const orderNo = `GRP${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      const order = await tx.order.create({
        data: {
          orderNo,
          userId,
          totalAmount: activity.groupPrice,
          payAmount: activity.groupPrice,
          status: 'GROUPING',
          addressName: dto.addressName,
          addressPhone: dto.addressPhone,
          addressDetail: dto.addressDetail,
          items: {
            create: {
              skuId: activity.skuId,
              skuName: (activity.sku?.specs as any)?.name || '拼团商品',
              specs: activity.sku?.specs || {},
              quantity: 1,
              unitPrice: activity.groupPrice,
            },
          },
        },
      });

      // Add member
      await tx.groupBuyMember.create({
        data: { groupId: group.id, userId, orderId: order.id },
      });

      // Check if group is full
      const memberCount = group.members.length + 1;
      if (memberCount >= activity.groupSize) {
        // Group success
        await tx.groupBuyGroup.update({
          where: { id: group.id },
          data: { status: 'SUCCESS' },
        });
        // Update all member orders to PAID
        const allMembers = await tx.groupBuyMember.findMany({ where: { groupId: group.id } });
        await tx.order.updateMany({
          where: { id: { in: allMembers.map((m) => m.orderId) } },
          data: { status: 'PAID' },
        });
        // Also update the new order
        await tx.order.update({
          where: { id: order.id },
          data: { status: 'PAID' },
        });
        // Increment salesCount
        await tx.product.update({
          where: { id: activity.productId },
          data: { salesCount: { increment: activity.groupSize } },
        });
      }

      return { group: { ...group, members: [...group.members, { userId, orderId: order.id }] }, order };
    });
  }

  async getMyGroups(userId: string, page = 1, pageSize = 20) {
    const [items, total] = await Promise.all([
      this.prisma.groupBuyMember.findMany({
        where: { userId },
        include: {
          group: {
            include: {
              activity: { include: { product: true, sku: true } },
              members: { include: { user: { select: { id: true, nickname: true, avatar: true } } } },
            },
          },
          order: true,
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { joinedAt: 'desc' },
      }),
      this.prisma.groupBuyMember.count({ where: { userId } }),
    ]);
    return { items, total, page, pageSize };
  }

  async getGroupDetail(id: string) {
    return this.prisma.groupBuyGroup.findUnique({
      where: { id },
      include: {
        activity: { include: { product: true, sku: { include: { prices: true } } } },
        members: {
          include: {
            user: { select: { id: true, nickname: true, avatar: true } },
            order: true,
          },
        },
        leader: { select: { id: true, nickname: true, avatar: true } },
      },
    });
  }

  async expireGroups() {
    const now = new Date();
    const expiredGroups = await this.prisma.groupBuyGroup.findMany({
      where: { status: 'PENDING', expireAt: { lt: now } },
      include: { members: true, activity: true },
    });

    for (const group of expiredGroups) {
      await this.prisma.$transaction(async (tx) => {
        await tx.groupBuyGroup.update({
          where: { id: group.id },
          data: { status: 'FAILED' },
        });
        // Cancel all member orders and restore stock
        for (const member of group.members) {
          await tx.order.update({
            where: { id: member.orderId },
            data: { status: 'CANCELLED' },
          });
          await tx.sku.update({
            where: { id: group.activity.skuId },
            data: { stock: { increment: 1 } },
          });
        }
      });
    }
    return { expired: expiredGroups.length };
  }

  async updateActivity(id: string, data: Partial<CreateActivityDto> & { status?: string }) {
    return this.prisma.groupBuyActivity.update({
      where: { id },
      data: {
        ...(data.groupPrice !== undefined && { groupPrice: data.groupPrice }),
        ...(data.groupSize !== undefined && { groupSize: data.groupSize }),
        ...(data.duration !== undefined && { duration: data.duration }),
        ...(data.maxGroups !== undefined && { maxGroups: data.maxGroups }),
        ...(data.startTime && { startTime: new Date(data.startTime) }),
        ...(data.endTime && { endTime: new Date(data.endTime) }),
        ...(data.status && { status: data.status }),
      },
    });
  }
}
