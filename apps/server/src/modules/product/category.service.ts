import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

@Injectable()
export class CategoryService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCategoryDto) {
    return this.prisma.category.create({
      data: {
        name: dto.name,
        parentId: dto.parentId || null,
        sort: dto.sort || 0,
      },
    });
  }

  async getTree() {
    const categories = await this.prisma.category.findMany({
      where: { parentId: null },
      orderBy: { sort: 'asc' },
      include: {
        children: {
          orderBy: { sort: 'asc' },
          include: {
            children: { orderBy: { sort: 'asc' } },
          },
        },
      },
    });
    return categories;
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('分类不存在');
    return this.prisma.category.update({
      where: { id },
      data: dto,
    });
  }

  async delete(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { children: true, products: true },
    });
    if (!category) throw new NotFoundException('分类不存在');
    if (category.children.length > 0) {
      throw new BadRequestException('该分类下有子分类，无法删除');
    }
    if (category.products.length > 0) {
      throw new BadRequestException('该分类下有商品，无法删除');
    }
    return this.prisma.category.delete({ where: { id } });
  }
}
