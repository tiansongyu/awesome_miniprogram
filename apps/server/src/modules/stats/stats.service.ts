import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Role, ProductStatus } from '@prisma/client';

@Injectable()
export class StatsService {
  constructor(private prisma: PrismaService) {}

  async getOverview(userId?: string, role?: string) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const isAgent = role && role !== Role.SUPER_ADMIN;

    if (isAgent && userId) {
      return this.getAgentOverview(userId, todayStart);
    }

    const [
      totalUsers,
      totalOrders,
      revenueResult,
      todayOrders,
      todayRevenueResult,
      totalProducts,
      onSaleProducts,
      totalAgents,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.order.count(),
      this.prisma.order.aggregate({
        _sum: { totalAmount: true },
      }),
      this.prisma.order.count({
        where: { createdAt: { gte: todayStart } },
      }),
      this.prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: { createdAt: { gte: todayStart } },
      }),
      this.prisma.product.count(),
      this.prisma.product.count({
        where: { status: ProductStatus.ON_SALE },
      }),
      this.prisma.user.count({
        where: {
          role: { in: [Role.AGENT_L1, Role.AGENT_L2, Role.AGENT_L3] },
        },
      }),
    ]);

    return {
      totalUsers,
      totalOrders,
      totalRevenue: Number(revenueResult._sum?.totalAmount ?? 0),
      todayOrders,
      todayRevenue: Number(todayRevenueResult._sum?.totalAmount ?? 0),
      totalProducts,
      onSaleProducts,
      totalAgents,
    };
  }

  private async getAgentOverview(userId: string, todayStart: Date) {
    const myProductIds = await this.prisma.product.findMany({
      where: { ownerId: userId },
      select: { id: true },
    }).then(ps => ps.map(p => p.id));

    const mySkuIds = await this.prisma.sku.findMany({
      where: { productId: { in: myProductIds } },
      select: { id: true },
    }).then(ss => ss.map(s => s.id));

    const orderWhere = {
      items: { some: { skuId: { in: mySkuIds } } },
    };

    const [
      totalCustomers,
      totalOrders,
      revenueResult,
      todayOrders,
      todayRevenueResult,
      totalProducts,
      onSaleProducts,
    ] = await Promise.all([
      this.prisma.user.count({ where: { parentAgentId: userId } }),
      this.prisma.order.count({ where: orderWhere }),
      this.prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: orderWhere,
      }),
      this.prisma.order.count({
        where: { ...orderWhere, createdAt: { gte: todayStart } },
      }),
      this.prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: { ...orderWhere, createdAt: { gte: todayStart } },
      }),
      this.prisma.product.count({ where: { ownerId: userId } }),
      this.prisma.product.count({
        where: { ownerId: userId, status: ProductStatus.ON_SALE },
      }),
    ]);

    return {
      totalUsers: totalCustomers,
      totalOrders,
      totalRevenue: Number(revenueResult._sum?.totalAmount ?? 0),
      todayOrders,
      todayRevenue: Number(todayRevenueResult._sum?.totalAmount ?? 0),
      totalProducts,
      onSaleProducts,
      totalAgents: 0,
    };
  }
}
