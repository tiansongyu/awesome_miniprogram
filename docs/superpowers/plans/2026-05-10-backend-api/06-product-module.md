# Task 9: 商品模块 - 分类

**Files:**
- Create: `apps/server/src/modules/product/product.module.ts`
- Create: `apps/server/src/modules/product/category.controller.ts`
- Create: `apps/server/src/modules/product/category.service.ts`
- Create: `apps/server/src/modules/product/dto/category.dto.ts`

---

- [ ] **Step 1: 创建分类 DTO**

`apps/server/src/modules/product/dto/category.dto.ts`:
```typescript
import { IsString, IsOptional, IsInt, Min } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sort?: number;
}

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sort?: number;
}
```

- [ ] **Step 2: 创建 CategoryService**

`apps/server/src/modules/product/category.service.ts`:
```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
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
      throw new Error('该分类下有子分类，无法删除');
    }
    if (category.products.length > 0) {
      throw new Error('该分类下有商品，无法删除');
    }
    return this.prisma.category.delete({ where: { id } });
  }
}
```

- [ ] **Step 3: 创建 CategoryController**

`apps/server/src/modules/product/category.controller.ts`:
```typescript
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CategoryService } from './category.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { Role } from '@prisma/client';

@Controller('api/v1/categories')
export class CategoryController {
  constructor(private categoryService: CategoryService) {}

  @Get()
  getTree() {
    return this.categoryService.getTree();
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.AGENT_L1)
  create(@Body() dto: CreateCategoryDto) {
    return this.categoryService.create(dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.AGENT_L1)
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoryService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  delete(@Param('id') id: string) {
    return this.categoryService.delete(id);
  }
}
```

- [ ] **Step 4: 提交**

```bash
git add .
git commit -m "feat: add category module"
```

---

# Task 10: 商品模块 - 商品 + SKU + 定价

**Files:**
- Create: `apps/server/src/modules/product/product.controller.ts`
- Create: `apps/server/src/modules/product/product.service.ts`
- Create: `apps/server/src/modules/product/dto/product.dto.ts`
- Create: `apps/server/src/modules/product/dto/sku.dto.ts`

---

- [ ] **Step 1: 创建商品 DTO**

`apps/server/src/modules/product/dto/product.dto.ts`:
```typescript
import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProductStatus } from '@prisma/client';
import { CreateSkuDto } from './sku.dto';

export class CreateProductDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @IsString({ each: true })
  images: string[];

  @IsString()
  categoryId: string;

  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSkuDto)
  skus: CreateSkuDto[];
}

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;
}

export class ProductQueryDto {
  page?: number = 1;
  pageSize?: number = 20;
  categoryId?: string;
  status?: ProductStatus;
  keyword?: string;
}
```

`apps/server/src/modules/product/dto/sku.dto.ts`:
```typescript
import {
  IsNumber,
  IsObject,
  IsArray,
  ValidateNested,
  IsEnum,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PriceType } from '@prisma/client';

export class SkuPriceDto {
  @IsEnum(PriceType)
  priceType: PriceType;

  @IsNumber()
  @Min(0)
  price: number;
}

export class CreateSkuDto {
  @IsObject()
  specs: Record<string, string>;

  @IsNumber()
  @Min(0)
  stock: number;

  @IsNumber()
  @Min(0)
  costPrice: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SkuPriceDto)
  prices: SkuPriceDto[];
}
```

- [ ] **Step 2: 创建 ProductService**

`apps/server/src/modules/product/product.service.ts`:
```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto, UpdateProductDto, ProductQueryDto } from './dto/product.dto';
import { CreateSkuDto } from './dto/sku.dto';
import { Role, MemberLevel, User, PriceType } from '@prisma/client';

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
        status: dto.status || 'DRAFT',
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

  async findAll(query: ProductQueryDto) {
    const { page = 1, pageSize = 20, categoryId, status, keyword } = query;
    const where: any = {};
    if (categoryId) where.categoryId = categoryId;
    if (status) where.status = status;
    if (keyword) where.name = { contains: keyword, mode: 'insensitive' };

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          category: { select: { id: true, name: true } },
          skus: { include: { prices: true } },
        },
      }),
      this.prisma.product.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        skus: { include: { prices: true } },
      },
    });
    if (!product) throw new NotFoundException('商品不存在');
    return product;
  }

  async findOneForUser(id: string, user: User) {
    const product = await this.findOne(id);
    const priceType = this.getPriceTypeForUser(user);

    const skus = product.skus.map((sku) => {
      const priceRecord = sku.prices.find((p) => p.priceType === priceType);
      const retailPrice = sku.prices.find((p) => p.priceType === PriceType.RETAIL);
      return {
        id: sku.id,
        specs: sku.specs,
        stock: sku.stock,
        price: priceRecord?.price || retailPrice?.price,
        originalPrice: retailPrice?.price,
      };
    });

    return {
      id: product.id,
      name: product.name,
      description: product.description,
      images: product.images,
      category: product.category,
      skus,
    };
  }

  private getPriceTypeForUser(user: User): PriceType {
    switch (user.role) {
      case Role.AGENT_L1:
      case Role.SUPER_ADMIN:
        return PriceType.AGENT_L1;
      case Role.AGENT_L2:
        return PriceType.AGENT_L2;
      case Role.AGENT_L3:
        return PriceType.AGENT_L3;
      default:
        switch (user.memberLevel) {
          case MemberLevel.GOLD:
            return PriceType.MEMBER_GOLD;
          case MemberLevel.SILVER:
            return PriceType.MEMBER_SILVER;
          default:
            return PriceType.MEMBER_BRONZE;
        }
    }
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.findOne(id);
    return this.prisma.product.update({
      where: { id },
      data: dto,
      include: { skus: { include: { prices: true } } },
    });
  }

  async updateSku(skuId: string, dto: CreateSkuDto) {
    return this.prisma.$transaction(async (tx) => {
      await tx.skuPrice.deleteMany({ where: { skuId } });
      return tx.sku.update({
        where: { id: skuId },
        data: {
          specs: dto.specs,
          stock: dto.stock,
          costPrice: dto.costPrice,
          prices: {
            create: dto.prices.map((p) => ({
              priceType: p.priceType,
              price: p.price,
            })),
          },
        },
        include: { prices: true },
      });
    });
  }

  async toggleStatus(id: string) {
    const product = await this.findOne(id);
    const newStatus = product.status === 'ON_SALE' ? 'OFF_SALE' : 'ON_SALE';
    return this.prisma.product.update({
      where: { id },
      data: { status: newStatus },
    });
  }

  async delete(id: string) {
    await this.findOne(id);
    return this.prisma.product.delete({ where: { id } });
  }
}
```

- [ ] **Step 3: 创建 ProductController**

`apps/server/src/modules/product/product.controller.ts`:
```typescript
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ProductService } from './product.service';
import { CreateProductDto, UpdateProductDto, ProductQueryDto } from './dto/product.dto';
import { CreateSkuDto } from './dto/sku.dto';
import { Role, User } from '@prisma/client';

@Controller('api/v1/products')
export class ProductController {
  constructor(private productService: ProductService) {}

  @Get()
  findAll(@Query() query: ProductQueryDto) {
    return this.productService.findAll(query);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.productService.findOneForUser(id, user);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.AGENT_L1)
  create(@Body() dto: CreateProductDto) {
    return this.productService.create(dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.AGENT_L1)
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productService.update(id, dto);
  }

  @Put('sku/:skuId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.AGENT_L1)
  updateSku(@Param('skuId') skuId: string, @Body() dto: CreateSkuDto) {
    return this.productService.updateSku(skuId, dto);
  }

  @Put(':id/toggle-status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.AGENT_L1)
  toggleStatus(@Param('id') id: string) {
    return this.productService.toggleStatus(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  delete(@Param('id') id: string) {
    return this.productService.delete(id);
  }
}
```

- [ ] **Step 4: 创建 ProductModule**

`apps/server/src/modules/product/product.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { CategoryController } from './category.controller';
import { CategoryService } from './category.service';

@Module({
  controllers: [ProductController, CategoryController],
  providers: [ProductService, CategoryService],
  exports: [ProductService],
})
export class ProductModule {}
```

- [ ] **Step 5: 注册到 AppModule 并提交**

```bash
git add .
git commit -m "feat: add product module with category, sku, and pricing"
```
