import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Role, PriceType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const AGENT_PRICE_MAP: Record<string, PriceType> = {
  [Role.AGENT_L1]: PriceType.AGENT_L1,
  [Role.AGENT_L2]: PriceType.AGENT_L2,
  [Role.AGENT_L3]: PriceType.AGENT_L3,
};

@Injectable()
export class SettlementService {
  constructor(private prisma: PrismaService) {}

  async settleOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, user: true },
    });
    if (!order) throw new NotFoundException('订单不存在');

    const agentChain = await this.buildAgentChain(order.userId);
    if (agentChain.length === 0) return [];

    const skuIds = order.items.map((item) => item.skuId);
    const skus = await this.prisma.sku.findMany({
      where: { id: { in: skuIds } },
      include: { prices: true },
    });

    const settlements: Array<{
      agentId: string;
      agentLevel: Role;
      profit: Decimal;
      description: string;
    }> = [];

    for (const agent of agentChain) {
      let totalProfit = new Decimal(0);

      for (const item of order.items) {
        const sku = skus.find((s) => s.id === item.skuId);
        if (!sku) continue;

        const agentPriceType = AGENT_PRICE_MAP[agent.role];
        const agentPrice = sku.prices.find((p) => p.priceType === agentPriceType);
        if (!agentPrice) continue;

        const sellingPrice = this.getSellingPrice(agent, agentChain, sku, order.user);
        if (!sellingPrice) continue;

        const profit = sellingPrice.sub(agentPrice.price).mul(item.quantity);
        if (profit.gt(0)) {
          totalProfit = totalProfit.add(profit);
        }
      }

      if (totalProfit.gt(0)) {
        settlements.push({
          agentId: agent.id,
          agentLevel: agent.role as Role,
          profit: totalProfit,
          description: `订单 ${order.orderNo} 分润`,
        });
      }
    }

    await this.prisma.$transaction(async (tx) => {
      for (const s of settlements) {
        await tx.settlement.create({
          data: {
            orderId,
            agentId: s.agentId,
            agentLevel: s.agentLevel,
            profit: s.profit,
            description: s.description,
          },
        });
        await tx.user.update({
          where: { id: s.agentId },
          data: { balance: { increment: s.profit } },
        });
      }
    });

    return settlements;
  }

  private getSellingPrice(
    agent: { id: string; role: string },
    agentChain: Array<{ id: string; role: string }>,
    sku: any,
    customer: any,
  ): Decimal | null {
    const agentIndex = agentChain.findIndex((a) => a.id === agent.id);

    if (agentIndex === 0) {
      const nextRole = this.getNextPriceType(agent.role as Role, customer);
      const price = sku.prices.find((p: any) => p.priceType === nextRole);
      return price ? price.price : null;
    }

    const childAgent = agentChain[agentIndex - 1];
    const childPriceType = AGENT_PRICE_MAP[childAgent.role];
    const childPrice = sku.prices.find((p: any) => p.priceType === childPriceType);
    return childPrice ? childPrice.price : null;
  }

  private getNextPriceType(agentRole: Role, customer: any): PriceType {
    if (agentRole === Role.AGENT_L3) {
      switch (customer.memberLevel) {
        case 'GOLD': return PriceType.MEMBER_GOLD;
        case 'SILVER': return PriceType.MEMBER_SILVER;
        default: return PriceType.MEMBER_BRONZE;
      }
    }
    if (agentRole === Role.AGENT_L1) return PriceType.AGENT_L2;
    if (agentRole === Role.AGENT_L2) return PriceType.AGENT_L3;
    return PriceType.RETAIL;
  }

  private async buildAgentChain(userId: string): Promise<Array<{ id: string; role: string }>> {
    const chain: Array<{ id: string; role: string }> = [];
    let currentId = userId;

    for (let i = 0; i < 4; i++) {
      const user = await this.prisma.user.findUnique({
        where: { id: currentId },
        select: { parentAgentId: true, parentAgent: { select: { id: true, role: true } } },
      });
      if (!user?.parentAgent) break;
      chain.push(user.parentAgent);
      currentId = user.parentAgent.id;
    }

    return chain;
  }

  async getAgentSettlements(agentId: string, page = 1, pageSize = 20) {
    const [items, total] = await Promise.all([
      this.prisma.settlement.findMany({
        where: { agentId },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          order: { select: { orderNo: true, totalAmount: true, createdAt: true } },
        },
      }),
      this.prisma.settlement.count({ where: { agentId } }),
    ]);
    return { items, total, page, pageSize };
  }

  async getSettlementStats(agentId: string) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [total, today, thisMonth] = await Promise.all([
      this.prisma.settlement.aggregate({
        where: { agentId },
        _sum: { profit: true },
        _count: true,
      }),
      this.prisma.settlement.aggregate({
        where: { agentId, createdAt: { gte: todayStart } },
        _sum: { profit: true },
      }),
      this.prisma.settlement.aggregate({
        where: { agentId, createdAt: { gte: monthStart } },
        _sum: { profit: true },
      }),
    ]);

    return {
      totalProfit: total._sum.profit || 0,
      totalCount: total._count,
      todayProfit: today._sum.profit || 0,
      monthProfit: thisMonth._sum.profit || 0,
    };
  }
}
