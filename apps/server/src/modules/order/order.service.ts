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
      case Role.AGENT_L1: return PriceType.AGENT_L1;
      case Role.AGENT_L2: return PriceType.AGENT_L2;
      case Role.AGENT_L3: return PriceType.AGENT_L3;
      case Role.CUSTOMER:
        switch (user.memberLevel) {
          case MemberLevel.GOLD: return PriceType.MEMBER_GOLD;
          case MemberLevel.SILVER: return PriceType.MEMBER_SILVER;
          default: return PriceType.MEMBER_BRONZE;
        }
      default: return PriceType.RETAIL;
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
      const orderItem = dto.items.find((i) => i.skuId === sku.id)!;
      if (sku.stock < orderItem.quantity) {
        throw new BadRequestException(`商品 ${sku.product.name} 库存不足`);
      }
    }

    const orderItems = dto.items.map((item) => {
      const sku = skus.find((s) => s.id === item.skuId)!;
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
      for (const item of dto.items) {
        const updated = await tx.sku.updateMany({
          where: { id: item.skuId, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });
        if (updated.count === 0) {
          throw new BadRequestException('库存不足，请重试');
        }
      }

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

    return { success: true };
  }

  async adminFindAll(query: { page?: number; pageSize?: number; status?: OrderStatus }) {
    const { page = 1, pageSize = 20, status } = query;
    const where: any = {};
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: { items: true, user: { select: { id: true, nickname: true, phone: true } } },
      }),
      this.prisma.order.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }
}
