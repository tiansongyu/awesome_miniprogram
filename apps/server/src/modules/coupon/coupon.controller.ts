import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CouponService } from './coupon.service';
import { CreateCouponDto, UpdateCouponDto } from './dto/coupon.dto';
import { Role, User, CouponStatus, UserCouponStatus } from '@prisma/client';

@Controller('coupons')
export class CouponController {
  constructor(private couponService: CouponService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  create(@Body() dto: CreateCouponDto) {
    return this.couponService.create(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  findAll(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: CouponStatus,
  ) {
    return this.couponService.findAll({
      page: page ? parseInt(page) : undefined,
      pageSize: pageSize ? parseInt(pageSize) : undefined,
      status,
    });
  }

  @Get('available')
  @UseGuards(JwtAuthGuard)
  findAvailable(@CurrentUser('id') userId: string) {
    return this.couponService.findAvailable(userId);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateCouponDto) {
    return this.couponService.update(id, dto);
  }

  @Post(':id/claim')
  @UseGuards(JwtAuthGuard)
  claim(@Param('id') id: string, @CurrentUser() user: User) {
    return this.couponService.claim(id, user.id);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  findMyCoupons(
    @CurrentUser() user: User,
    @Query('status') status?: UserCouponStatus,
  ) {
    return this.couponService.findMyCoupons(user.id, status);
  }
}
