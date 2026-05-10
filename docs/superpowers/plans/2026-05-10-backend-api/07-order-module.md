# Task 11: 订单模块

**Files:**
- Create: `apps/server/src/modules/order/order.module.ts`
- Create: `apps/server/src/modules/order/order.controller.ts`
- Create: `apps/server/src/modules/order/order.service.ts`
- Create: `apps/server/src/modules/order/dto/create-order.dto.ts`
- Test: `apps/server/src/modules/order/order.service.spec.ts`

---

- [ ] **Step 1: 创建订单 DTO**

`apps/server/src/modules/order/dto/create-order.dto.ts`:
```typescript
import { IsArray, IsOptional, IsString, ValidateNested, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class OrderItemDto {
  @IsString()
  skuId: string;

  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreateOrderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @IsOptional()
  @IsString()
  remark?: string;
}
```

- [ ] **Step 2: 创建 OrderService**

`apps/server/src/modules/order/order.service.ts`:
```typescript
import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { User, Role, MemberLevel, PriceType, OrderStatus } from '@prisma/client';
import { CreateOrderDto } from './dto/create-order.dto';
import { generateOrderNo } from '@agent-saler/utils';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class OrderService {
  constructor(private prisma: PrismaService) {}

  private getPriceTypeForUser(user: User): PriceType {
    switch (user.role) {
      case Role.AGENT_L1:
        return PriceType.AGENT_L1;
      case Role.AGENT_L2:
        return PriceType.AGENT_L2;
      case Role.AGENT_L3:
        return PriceType.AGENT_L3;
      case Role.CUSTOMER:
        switch (user.memberLevel) {
          case MemberLevel.GOLD:
            return PriceType.MEMBER_GOLD;
          case MemberLevel.SILVER:
            return PriceType.MEMBER_SILVER;
          default:
            return PriceType.MEMBER_BRONZE;
        }
      default:
        return PriceType.RETAIL;
    }
  }

  async create(user: User, dto: CreateOrderDto) {
    const priceType = this.getPriceTypeForUser(user);

    const skuIds = dto.items.map((item) => item.skuId);
    const skus = await this.prisma.sku.findMany({
      where: { id: { in: skuIds } },
      include: {
        prices: true,
        product: { select: { name: true, status: true } },
      },
    });

    if (skus.length !== skuIds.length) {
      throw new BadRequestException('部分商品不存在');
    }

    for (const sku of skus) {
      if (sku.product.status !== 'ON_SALE') {
        throw new BadRequestException(`商品 ${sku.product.name} 已下架`);
      }
      const orderItem = dto.items.find((i) => i.skuId === sku.id);
      if (sku.stock < orderItem.quantity) {
        throw new BadRequestException(`商品 ${sku.product.name} 库存不足`);
      }
    }

    const orderItems = dto.items.map((item) => {
      const sku = skus.find((s) => s.id === item.skuId);
      const skuPrice = sku.prices.find((p) => p.priceType === priceType);
      const unitPrice = skuPrice ? skuPrice.price : sku.costPrice;
      return {
        skuId: item.skuId,
        skuName: sku.product.name,
        specs: sku.specs as object,
        quantity: item.quantity,
        unitPrice,
      };
    });

    const totalAmount = orderItems.reduce(
      (sum, item) => sum.add(new Decimal(item.unitPrice.toString()).mul(item.quantity)),
      new Decimal(0),
    );

    const order = await this.prisma.$transaction(async (tx) => {
      // 扣减库存
      for (const item of dto.items) {
        const updated = await tx.sku.updateMany({
          where: { id: item.skuId, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });
        if (updated.count === 0) {
          throw new BadRequestException('库存不足，请重试');
        }
      }

      // 创建订单
      return tx.order.create({
        data: {
          orderNo: generateOrderNo(),
          userId: user.id,
          agentId: user.parentAgentId,
          totalAmount,
          remark: dto.remark,
          items: {
            create: orderItems,
          },
        },
        include: { items: true },
      });
    });

    return order;
  }

  async findByUser(userId: string, status?: OrderStatus, page = 1, pageSize = 20) {
    const where: any = { userId };
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: { items: true },
      }),
      this.prisma.order.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async findById(orderId: string, userId?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, settlements: true },
    });
    if (!order) throw new NotFoundException('订单不存在');
    if (userId && order.userId !== userId) {
      throw new ForbiddenException('无权查看该订单');
    }
    return order;
  }

  async updateStatus(orderId: string, status: OrderStatus) {
    return this.prisma.order.update({
      where: { id: orderId },
      data: { status },
    });
  }

  async cancelOrder(orderId: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) throw new NotFoundException('订单不存在');
    if (order.userId !== userId) throw new ForbiddenException('无权操作');
    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('只能取消待支付订单');
    }

    await this.prisma.$transaction(async (tx) => {
      // 恢复库存
      for (const item of order.items) {
        await tx.sku.update({
          where: { id: item.skuId },
          data: { stock: { increment: item.quantity } },
        });
      }
      await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.CANCELLED },
      });
    });
  }
}
```

- [ ] **Step 3: 创建 OrderController**

`apps/server/src/modules/order/order.controller.ts`:
```typescript
import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { User, Role, OrderStatus } from '@prisma/client';

@Controller('api/v1/orders')
@UseGuards(JwtAuthGuard)
export class OrderController {
  constructor(private orderService: OrderService) {}

  @Post()
  create(@CurrentUser() user: User, @Body() dto: CreateOrderDto) {
    return this.orderService.create(user, dto);
  }

  @Get()
  findByUser(
    @CurrentUser() user: User,
    @Query('status') status?: OrderStatus,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize?: number,
  ) {
    return this.orderService.findByUser(user.id, status, page, pageSize);
  }

  @Get(':id')
  findById(@CurrentUser() user: User, @Param('id') id: string) {
    return this.orderService.findById(id, user.id);
  }

  @Put(':id/cancel')
  cancel(@CurrentUser() user: User, @Param('id') id: string) {
    return this.orderService.cancelOrder(id, user.id);
  }

  @Put(':id/ship')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.AGENT_L1)
  ship(@Param('id') id: string) {
    return this.orderService.updateStatus(id, OrderStatus.SHIPPED);
  }

  @Put(':id/complete')
  complete(@CurrentUser() user: User, @Param('id') id: string) {
    return this.orderService.updateStatus(id, OrderStatus.COMPLETED);
  }
}
```

- [ ] **Step 4: 创建 OrderModule**

`apps/server/src/modules/order/order.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';

@Module({
  controllers: [OrderController],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule {}
```

- [ ] **Step 5: 注册到 AppModule**

在 `apps/server/src/app.module.ts` 的 imports 中添加 `OrderModule`。

- [ ] **Step 6: 编写测试**

`apps/server/src/modules/order/order.service.spec.ts`:
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { OrderService } from './order.service';
import { PrismaService } from '../../prisma/prisma.service';
import { Role, MemberLevel } from '@prisma/client';

describe('OrderService', () => {
  let service: OrderService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        {
          provide: PrismaService,
          useValue: {
            sku: { findMany: jest.fn(), updateMany: jest.fn() },
            order: {
              create: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              count: jest.fn(),
              update: jest.fn(),
            },
            $transaction: jest.fn((fn) => fn(prisma)),
          },
        },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
```

- [ ] **Step 7: 运行测试**

```bash
cd apps/server && pnpm test -- --testPathPattern=order
```

Expected: PASS

- [ ] **Step 8: 提交**

```bash
git add .
git commit -m "feat: add order module with create, list, cancel, ship"
```
