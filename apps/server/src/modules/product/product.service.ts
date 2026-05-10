import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { User, Role, MemberLevel, PriceType, ProductStatus } from '@prisma/client';

@Injectable()
export class ProductService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateProductDto) {
    return this.prisma.product.create({
      data: {
        name: dto.name,
        description: dto.description,
        images: dto.images,
        categoryId: dto.categoryId,
        status: dto.status || ProductStatus.DRAFT,
        skus: {
          create: dto.skus.map((sku) => ({
            specs: sku.specs,
            stock: sku.stock,
            costPrice: sku.costPrice,
            prices: {
              create: sku.prices.map((p) => ({
                priceType: p.priceType,
                price: p.price,
              })),
            },
          })),
        },
      },
      include: { skus: { include: { prices: true } } },
    });
  }

  private async getAllDescendantCategoryIds(parentId: string): Promise<string[]> {
    const children = await this.prisma.category.findMany({
      where: { parentId },
      select: { id: true },
    });
    const ids: string[] = [parentId];
    for (const child of children) {
      const descendantIds = await this.getAllDescendantCategoryIds(child.id);
      ids.push(...descendantIds);
    }
    return ids;
  }

  async findAll(query: { page?: number; pageSize?: number; categoryId?: string; status?: ProductStatus; keyword?: string }) {
    const { page = 1, pageSize = 20, categoryId, status, keyword } = query;
    const where: any = {};
    if (categoryId) {
      const categoryIds = await this.getAllDescendantCategoryIds(categoryId);
      where.categoryId = { in: categoryIds };
    }
    if (status) where.status = status;
    if (keyword) where.name = { contains: keyword, mode: 'insensitive' };

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: { skus: { include: { prices: true } }, category: true },
      }),
      this.prisma.product.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { skus: { include: { prices: true } }, category: true },
    });
    if (!product) throw new NotFoundException('商品不存在');
    return product;
  }

  async findOneForUser(id: string, user: User) {
    const product = await this.findOne(id);
    const priceType = this.getPriceTypeForUser(user);
    const skus = product.skus.map((sku) => {
      const price = sku.prices.find((p) => p.priceType === priceType);
      return {
        ...sku,
        displayPrice: price ? price.price : null,
      };
    });
    return { ...product, skus };
  }

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

  async update(id: string, dto: UpdateProductDto) {
    await this.findOne(id);
    const { skus, ...basicFields } = dto;

    if (skus) {
      await this.prisma.$transaction(async (tx) => {
        // Delete old SKUs and their prices
        const oldSkus = await tx.sku.findMany({ where: { productId: id } });
        for (const sku of oldSkus) {
          await tx.skuPrice.deleteMany({ where: { skuId: sku.id } });
        }
        await tx.sku.deleteMany({ where: { productId: id } });

        // Update basic fields and create new SKUs
        await tx.product.update({
          where: { id },
          data: {
            ...basicFields,
            skus: {
              create: skus.map((sku) => ({
                specs: sku.specs,
                stock: sku.stock,
                costPrice: sku.costPrice,
                prices: {
                  create: sku.prices.map((p) => ({
                    priceType: p.priceType,
                    price: p.price,
                  })),
                },
              })),
            },
          },
        });
      });
    } else {
      await this.prisma.product.update({
        where: { id },
        data: basicFields,
      });
    }

    return this.findOne(id);
  }

  async updateStatus(id: string, status: ProductStatus) {
    await this.findOne(id);
    return this.prisma.product.update({
      where: { id },
      data: { status },
    });
  }

  async delete(id: string) {
    await this.findOne(id);
    return this.prisma.product.delete({ where: { id } });
  }
}
