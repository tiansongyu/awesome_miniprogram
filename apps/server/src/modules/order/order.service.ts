import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { User, Role, MemberLevel, PriceType, OrderStatus, CouponType, UserCouponStatus } from '@prisma/client';
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

    // 处理优惠券
    let discountAmount = new Decimal(0);
    let userCouponId: string | undefined;

    if (dto.couponId) {
      const userCoupon = await this.prisma.userCoupon.findFirst({
        where: {
          id: dto.couponId,
          userId: user.id,
          status: UserCouponStatus.UNUSED,
        },
        include: { coupon: true },
      });

      if (!userCoupon) {
        throw new BadRequestException('优惠券不可用');
      }

      const coupon = userCoupon.coupon;
      const now = new Date();
      if (now < coupon.startTime || now > coupon.endTime) {
        throw new BadRequestException('优惠券不在有效期内');
      }

      if (totalAmount.lessThan(new Decimal(coupon.minAmount.toString()))) {
        throw new BadRequestException('订单金额未满足优惠券最低消费条件');
      }

      // 计算折扣金额
      if (coupon.type === CouponType.FIXED) {
        discountAmount = new Decimal(coupon.value.toString());
      } else if (coupon.type === CouponType.PERCENT) {
        // PERCENT 类型: value 为折扣，如 8.5 表示 8.5 折
        discountAmount = totalAmount.mul(new Decimal(1).sub(new Decimal(coupon.value.toString()).div(10)));
      }

      // 折扣不能超过订单总额
      if (discountAmount.greaterThan(totalAmount)) {
        discountAmount = totalAmount;
      }

      userCouponId = userCoupon.id;
    }

    const payAmount = totalAmount.sub(discountAmount);

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

      // 标记优惠券为已使用
      if (userCouponId) {
        await tx.userCoupon.update({
          where: { id: userCouponId },
          data: { status: UserCouponStatus.USED, usedAt: new Date() },
        });
      }

      return tx.order.create({
        data: {
          orderNo: generateOrderNo(),
          userId: user.id,
          agentId: user.parentAgentId,
          totalAmount,
          discountAmount,
          payAmount,
          couponId: userCouponId || null,
          remark: dto.remark,
          addressName: dto.addressName,
          addressPhone: dto.addressPhone,
          addressDetail: dto.addressDetail,
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
      include: { items: true, settlements: true, refunds: true },
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

  async ship(orderId: string, expressCompany: string, expressNo: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('订单不存在');
    if (order.status !== OrderStatus.PAID) {
      throw new BadRequestException('只有已支付订单可以发货');
    }

    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.SHIPPED,
        expressCompany,
        expressNo,
      },
    });
  }
}
