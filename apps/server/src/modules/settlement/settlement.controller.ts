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
@Roles(Role.SUPER_ADMIN, Role.AGENT_L1, Role.AGENT_L2, Role.AGENT_L3)
export class SettlementController {
  constructor(private settlementService: SettlementService) {}

  @Get()
  getMySettlements(
    @CurrentUser() user: User,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
  ) {
    return this.settlementService.getAgentSettlements(user.id, page, pageSize);
  }

  @Get('stats')
  getMyStats(@CurrentUser() user: User) {
    return this.settlementService.getSettlementStats(user.id);
  }
}
