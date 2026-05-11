import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Role, ProductStatus } from '@prisma/client';

@Injectable()
export class StatsService {
  constructor(private prisma: PrismaService) {}

  async getOverview() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

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
      totalRevenue: Number(revenueResult._sum.totalAmount ?? 0),
      todayOrders,
      todayRevenue: Number(todayRevenueResult._sum.totalAmount ?? 0),
      totalProducts,
      onSaleProducts,
      totalAgents,
    };
  }
}
