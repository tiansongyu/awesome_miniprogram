import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FavoriteService {
  constructor(private prisma: PrismaService) {}

  /** 切换收藏状态（toggle） */
  async toggle(userId: string, productId: string) {
    const existing = await this.prisma.favorite.findUnique({
      where: { userId_productId: { userId, productId } },
    });

    if (existing) {
      await this.prisma.favorite.delete({
        where: { id: existing.id },
      });
      return { favorited: false };
    }

    await this.prisma.favorite.create({
      data: { userId, productId },
    });
    return { favorited: true };
  }

  /** 获取收藏列表 */
  async list(userId: string, page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      this.prisma.favorite.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        include: {
          product: {
            include: {
              skus: {
                include: { prices: true },
                take: 1,
              },
            },
          },
        },
      }),
      this.prisma.favorite.count({ where: { userId } }),
    ]);

    return { items, total, page, pageSize };
  }

  /** 检查是否已收藏 */
  async status(userId: string, productId: string) {
    const existing = await this.prisma.favorite.findUnique({
      where: { userId_productId: { userId, productId } },
    });
    return { favorited: !!existing };
  }

  /** 取消收藏（用于列表删除） */
  async remove(userId: string, productId: string) {
    await this.prisma.favorite.deleteMany({
      where: { userId, productId },
    });
    return { success: true };
  }
}
