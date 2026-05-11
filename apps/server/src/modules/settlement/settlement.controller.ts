import {
  Controller,
  Get,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SettlementService } from './settlement.service';
import { Role, User } from '@prisma/client';

@Controller('settlements')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SettlementController {
  constructor(private settlementService: SettlementService) {}

  /** 管理员查看所有结算记录 */
  @Get()
  @Roles(Role.SUPER_ADMIN)
  getAllSettlements(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
  ) {
    return this.settlementService.getAllSettlements(page, pageSize);
  }

  /** 查看自己的结算记录 */
  @Get('my')
  @Roles(Role.SUPER_ADMIN, Role.AGENT_L1, Role.AGENT_L2, Role.AGENT_L3, Role.CUSTOMER)
  getMySettlements(
    @CurrentUser() user: User,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
  ) {
    return this.settlementService.getAgentSettlements(user.id, page, pageSize);
  }

  /** 查看自己的收益统计 */
  @Get('stats')
  @Roles(Role.SUPER_ADMIN, Role.AGENT_L1, Role.AGENT_L2, Role.AGENT_L3, Role.CUSTOMER)
  getMyStats(@CurrentUser() user: User) {
    return this.settlementService.getSettlementStats(user.id);
  }
}
