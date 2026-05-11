import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { RefundService } from './refund.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role, RefundStatus } from '@prisma/client';

@Controller('refunds')
@UseGuards(JwtAuthGuard)
export class RefundController {
  constructor(private refundService: RefundService) {}

  /** 用户申请退款 */
  @Post()
  create(
    @CurrentUser('id') userId: string,
    @Body() body: { orderId: string; reason: string },
  ) {
    return this.refundService.create(userId, body);
  }

  /** 用户查看自己的退款申请 */
  @Get('my')
  findMyRefunds(
    @CurrentUser('id') userId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.refundService.findMyRefunds(
      userId,
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : 10,
    );
  }

  /** 管理员查看所有退款申请 */
  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.AGENT_L1)
  findAll(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: RefundStatus,
  ) {
    return this.refundService.findAll(
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : 10,
      status,
    );
  }

  /** 管理员同意退款 */
  @Put(':id/approve')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.AGENT_L1)
  approve(
    @Param('id') id: string,
    @Body('remark') remark?: string,
  ) {
    return this.refundService.approve(id, remark);
  }

  /** 管理员拒绝退款 */
  @Put(':id/reject')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.AGENT_L1)
  reject(
    @Param('id') id: string,
    @Body('remark') remark?: string,
  ) {
    return this.refundService.reject(id, remark);
  }
}
