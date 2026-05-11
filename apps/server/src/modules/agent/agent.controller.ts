import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AgentService } from './agent.service';
import { CreateAgentDto, UpdateAgentDto } from './dto/create-agent.dto';
import { Role, User } from '@prisma/client';

@Controller('agents')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AgentController {
  constructor(private agentService: AgentService) {}

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.AGENT_L1, Role.AGENT_L2)
  create(@CurrentUser() user: User, @Body() dto: CreateAgentDto) {
    return this.agentService.createSubAgent(user, dto);
  }

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.AGENT_L1, Role.AGENT_L2)
  list(
    @CurrentUser() user: User,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
    @Query('role') role?: string,
  ) {
    return this.agentService.getSubAgents(user, page, pageSize, role);
  }

  @Get('tree')
  @Roles(Role.SUPER_ADMIN, Role.AGENT_L1, Role.AGENT_L2)
  tree(@CurrentUser() user: User) {
    return this.agentService.getAgentTree(user);
  }

  @Get('stats')
  @Roles(Role.SUPER_ADMIN, Role.AGENT_L1, Role.AGENT_L2, Role.AGENT_L3)
  stats(@CurrentUser() user: User) {
    return this.agentService.getAgentStats(user.id);
  }

  @Put(':id')
  @Roles(Role.SUPER_ADMIN, Role.AGENT_L1, Role.AGENT_L2)
  update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateAgentDto,
  ) {
    return this.agentService.updateAgent(user, id, dto);
  }

  @Post(':id/freeze')
  @Roles(Role.SUPER_ADMIN, Role.AGENT_L1, Role.AGENT_L2)
  freeze(@CurrentUser() user: User, @Param('id') id: string) {
    return this.agentService.freezeAgent(user, id);
  }

  @Post(':id/unfreeze')
  @Roles(Role.SUPER_ADMIN, Role.AGENT_L1, Role.AGENT_L2)
  unfreeze(@CurrentUser() user: User, @Param('id') id: string) {
    return this.agentService.unfreezeAgent(user, id);
  }
}
