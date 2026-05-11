import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReviewService {
  constructor(private prisma: PrismaService) {}

  /** 用户提交评价（订单必须已完成） */
  async create(
    userId: string,
    data: { orderId: string; productId: string; rating: number; content?: string; images?: string[] },
  ) {
    const { orderId, productId, rating, content, images } = data;

    if (rating < 1 || rating > 5) {
      throw new BadRequestException('评分必须在 1-5 之间');
    }

    // 验证订单属于该用户且已完成
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      throw new BadRequestException('订单不存在');
    }
    if (order.userId !== userId) {
      throw new ForbiddenException('无权评价此订单');
    }
    if (order.status !== 'COMPLETED') {
      throw new BadRequestException('只能评价已完成的订单');
    }

    // 验证商品在订单中
    const hasProduct = order.items.some((item) => item.skuId === productId) ||
      await this.prisma.orderItem.findFirst({
        where: {
          orderId,
          order: { items: { some: { orderId } } },
        },
        include: { order: true },
      });

    // 检查是否已评价
    const existing = await this.prisma.review.findUnique({
      where: { userId_orderId_productId: { userId, orderId, productId } },
    });
    if (existing) {
      throw new BadRequestException('该商品已评价');
    }

    return this.prisma.review.create({
      data: {
        userId,
        orderId,
        productId,
        rating,
        content: content || null,
        images: images || [],
      },
    });
  }

  /** 获取商品评价列表 */
  async listByProduct(productId: string, page = 1, pageSize = 10) {
    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      this.prisma.review.findMany({
        where: { productId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        include: {
          user: { select: { id: true, nickname: true, avatar: true } },
        },
      }),
      this.prisma.review.count({ where: { productId } }),
    ]);

    return { items, total, page, pageSize };
  }

  /** 获取我的评价列表 */
  async listByUser(userId: string, page = 1, pageSize = 10) {
    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      this.prisma.review.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        include: {
          product: { select: { id: true, name: true, images: true } },
        },
      }),
      this.prisma.review.count({ where: { userId } }),
    ]);

    return { items, total, page, pageSize };
  }
}
