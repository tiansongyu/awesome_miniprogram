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
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { Role, User, OrderStatus } from '@prisma/client';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrderController {
  constructor(private orderService: OrderService) {}

  @Post()
  create(@CurrentUser() user: User, @Body() dto: CreateOrderDto) {
    return this.orderService.create(user, dto);
  }

  @Get()
  findMyOrders(
    @CurrentUser() user: User,
    @Query('status') status?: OrderStatus,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.orderService.findByUser(
      user.id,
      status,
      page ? parseInt(page) : undefined,
      pageSize ? parseInt(pageSize) : undefined,
    );
  }

  @Get('admin')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.AGENT_L1)
  adminFindAll(
    @Query('status') status?: OrderStatus,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.orderService.adminFindAll({
      status,
      page: page ? parseInt(page) : undefined,
      pageSize: pageSize ? parseInt(pageSize) : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.orderService.findById(id, user.id);
  }

  @Put(':id/cancel')
  cancel(@Param('id') id: string, @CurrentUser() user: User) {
    return this.orderService.cancelOrder(id, user.id);
  }

  @Put(':id/status')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.AGENT_L1)
  updateStatus(@Param('id') id: string, @Body('status') status: OrderStatus) {
    return this.orderService.updateStatus(id, status);
  }
}
