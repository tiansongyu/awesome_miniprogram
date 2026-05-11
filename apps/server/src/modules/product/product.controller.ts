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
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ProductService } from './product.service';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { Role, ProductStatus } from '@prisma/client';

@Controller('products')
export class ProductController {
  constructor(private productService: ProductService) {}

  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('categoryId') categoryId?: string,
    @Query('status') status?: ProductStatus,
    @Query('keyword') keyword?: string,
    @Query('sortBy') sortBy?: string,
  ) {
    return this.productService.findAll({
      page: page ? parseInt(page) : undefined,
      pageSize: pageSize ? parseInt(pageSize) : undefined,
      categoryId,
      status,
      keyword,
      sortBy,
    });
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.AGENT_L1, Role.AGENT_L2, Role.AGENT_L3)
  findMine(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('categoryId') categoryId?: string,
    @Query('status') status?: ProductStatus,
    @Query('keyword') keyword?: string,
    @Query('sortBy') sortBy?: string,
  ) {
    return this.productService.findAll({
      page: page ? parseInt(page) : undefined,
      pageSize: pageSize ? parseInt(pageSize) : undefined,
      categoryId,
      status,
      keyword,
      sortBy,
      ownerId: role === Role.SUPER_ADMIN ? undefined : userId,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.AGENT_L1)
  create(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Body() dto: CreateProductDto,
  ) {
    const ownerId = role === Role.SUPER_ADMIN ? undefined : userId;
    return this.productService.create(dto, ownerId);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.AGENT_L1)
  async update(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    if (role !== Role.SUPER_ADMIN) {
      await this.checkOwnership(id, userId);
    }
    return this.productService.update(id, dto);
  }

  @Put(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.AGENT_L1)
  async updateStatus(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Param('id') id: string,
    @Body('status') status: ProductStatus,
  ) {
    if (role !== Role.SUPER_ADMIN) {
      await this.checkOwnership(id, userId);
    }
    return this.productService.updateStatus(id, status);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.AGENT_L1)
  async delete(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Param('id') id: string,
  ) {
    if (role !== Role.SUPER_ADMIN) {
      await this.checkOwnership(id, userId);
    }
    return this.productService.delete(id);
  }

  private async checkOwnership(productId: string, userId: string) {
    const product = await this.productService.findOne(productId);
    if (product.ownerId !== userId) {
      throw new ForbiddenException('无权操作此商品');
    }
  }
}
