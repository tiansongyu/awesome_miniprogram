# Task 12: 分润结算模块

**Files:**
- Create: `apps/server/src/modules/settlement/settlement.module.ts`
- Create: `apps/server/src/modules/settlement/settlement.controller.ts`
- Create: `apps/server/src/modules/settlement/settlement.service.ts`
- Test: `apps/server/src/modules/settlement/settlement.service.spec.ts`

---

- [ ] **Step 1: 创建 SettlementService**

`apps/server/src/modules/settlement/settlement.service.ts`:
```typescript
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
      include: {
        items: true,
        user: true,
      },
    });
    if (!order) throw new NotFoundException('订单不存在');

    // 找到代理链: customer -> L3 -> L2 -> L1
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

        // 该代理的拿货价
        const agentPriceType = AGENT_PRICE_MAP[agent.role];
        const agentPrice = sku.prices.find(
          (p) => p.priceType === agentPriceType,
        );
        if (!agentPrice) continue;

        // 该代理的售出价 = 下级的拿货价 或 客户支付价
        const sellingPrice = this.getSellingPrice(agent, agentChain, sku, order.user);
        if (!sellingPrice) continue;

        const profit = sellingPrice
          .sub(agentPrice.price)
          .mul(item.quantity);

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

    // 事务写入结算记录并更新余额
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
    // 找到该代理的下级在链中的位置
    const agentIndex = agentChain.findIndex((a) => a.id === agent.id);

    if (agentIndex === 0) {
      // 最底层代理（直接面对客户），售出价 = 客户支付价（即订单中的 unitPrice）
      // 用下级代理价或会员价
      const nextRole = this.getNextPriceType(agent.role as Role, customer);
      const price = sku.prices.find((p: any) => p.priceType === nextRole);
      return price ? price.price : null;
    }

    // 上级代理的售出价 = 下级代理的拿货价
    const childAgent = agentChain[agentIndex - 1];
    const childPriceType = AGENT_PRICE_MAP[childAgent.role];
    const childPrice = sku.prices.find((p: any) => p.priceType === childPriceType);
    return childPrice ? childPrice.price : null;
  }

  private getNextPriceType(agentRole: Role, customer: any): PriceType {
    if (agentRole === Role.AGENT_L3) {
      switch (customer.memberLevel) {
        case 'GOLD':
          return PriceType.MEMBER_GOLD;
        case 'SILVER':
          return PriceType.MEMBER_SILVER;
        default:
          return PriceType.MEMBER_BRONZE;
      }
    }
    // L1 卖给 L2, L2 卖给 L3
    if (agentRole === Role.AGENT_L1) return PriceType.AGENT_L2;
    if (agentRole === Role.AGENT_L2) return PriceType.AGENT_L3;
    return PriceType.RETAIL;
  }

  private async buildAgentChain(
    userId: string,
  ): Promise<Array<{ id: string; role: string }>> {
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
    const [total, today, thisMonth] = await Promise.all([
      this.prisma.settlement.aggregate({
        where: { agentId },
        _sum: { profit: true },
        _count: true,
      }),
      this.prisma.settlement.aggregate({
        where: {
          agentId,
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
        _sum: { profit: true },
      }),
      this.prisma.settlement.aggregate({
        where: {
          agentId,
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
        _sum: { profit: true },
      }),
    ]);

    return {
      totalProfit: total._sum.profit || 0,
      totalOrders: total._count,
      todayProfit: today._sum.profit || 0,
      monthProfit: thisMonth._sum.profit || 0,
    };
  }
}
```

- [ ] **Step 2: 创建 SettlementController**

`apps/server/src/modules/settlement/settlement.controller.ts`:
```typescript
import {
  Controller,
  Get,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SettlementService } from './settlement.service';
import { User, Role } from '@prisma/client';

@Controller('api/v1/settlements')
@UseGuards(JwtAuthGuard)
export class SettlementController {
  constructor(private settlementService: SettlementService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.AGENT_L1, Role.AGENT_L2, Role.AGENT_L3)
  getSettlements(
    @CurrentUser() user: User,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
  ) {
    return this.settlementService.getAgentSettlements(user.id, page, pageSize);
  }

  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.AGENT_L1, Role.AGENT_L2, Role.AGENT_L3)
  getStats(@CurrentUser() user: User) {
    return this.settlementService.getSettlementStats(user.id);
  }
}
```

- [ ] **Step 3: 创建 SettlementModule**

`apps/server/src/modules/settlement/settlement.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { SettlementController } from './settlement.controller';
import { SettlementService } from './settlement.service';

@Module({
  controllers: [SettlementController],
  providers: [SettlementService],
  exports: [SettlementService],
})
export class SettlementModule {}
```

- [ ] **Step 4: 在 OrderService 中集成结算**

在 `apps/server/src/modules/order/order.service.ts` 中注入 `SettlementService`，在模拟支付成功后调用：

```typescript
// 在 OrderModule 中 import SettlementModule
// 在 OrderService constructor 中注入 SettlementService

async simulatePay(orderId: string, userId: string) {
  const order = await this.findById(orderId, userId);
  if (order.status !== OrderStatus.PENDING) {
    throw new BadRequestException('订单状态不允许支付');
  }
  await this.updateStatus(orderId, OrderStatus.PAID);
  // 触发分润结算
  await this.settlementService.settleOrder(orderId);
  return { message: '支付成功' };
}
```

- [ ] **Step 5: 注册到 AppModule**

在 `apps/server/src/app.module.ts` 的 imports 中添加 `SettlementModule`。

- [ ] **Step 6: 编写测试**

`apps/server/src/modules/settlement/settlement.service.spec.ts`:
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { SettlementService } from './settlement.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('SettlementService', () => {
  let service: SettlementService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettlementService,
        {
          provide: PrismaService,
          useValue: {
            order: { findUnique: jest.fn() },
            sku: { findMany: jest.fn() },
            user: { findUnique: jest.fn(), update: jest.fn() },
            settlement: {
              create: jest.fn(),
              findMany: jest.fn(),
              count: jest.fn(),
              aggregate: jest.fn(),
            },
            $transaction: jest.fn((fn) => fn(prisma)),
          },
        },
      ],
    }).compile();

    service = module.get<SettlementService>(SettlementService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return empty array when no agent chain', async () => {
    (prisma.order.findUnique as jest.Mock).mockResolvedValue({
      id: 'order-1',
      orderNo: 'ORD001',
      userId: 'user-1',
      items: [{ skuId: 'sku-1', quantity: 1 }],
      user: { memberLevel: 'BRONZE' },
    });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      parentAgentId: null,
      parentAgent: null,
    });

    const result = await service.settleOrder('order-1');
    expect(result).toEqual([]);
  });
});
```

- [ ] **Step 7: 运行测试并提交**

```bash
cd apps/server
pnpm test -- --testPathPattern=settlement
git add .
git commit -m "feat: add settlement module with profit calculation"
```
