import { Controller, Post, Get, Delete, Param, Query, UseGuards } from '@nestjs/common';
import { FavoriteService } from './favorite.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('favorites')
@UseGuards(JwtAuthGuard)
export class FavoriteController {
  constructor(private favoriteService: FavoriteService) {}

  @Post(':productId')
  async toggle(
    @CurrentUser('id') userId: string,
    @Param('productId') productId: string,
  ) {
    return this.favoriteService.toggle(userId, productId);
  }

  @Get()
  async list(
    @CurrentUser('id') userId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.favoriteService.list(
      userId,
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : 20,
    );
  }

  @Get(':productId/status')
  async status(
    @CurrentUser('id') userId: string,
    @Param('productId') productId: string,
  ) {
    return this.favoriteService.status(userId, productId);
  }

  @Delete(':productId')
  async remove(
    @CurrentUser('id') userId: string,
    @Param('productId') productId: string,
  ) {
    return this.favoriteService.remove(userId, productId);
  }
}
