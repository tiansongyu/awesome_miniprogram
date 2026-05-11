import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, BadRequestException, NotFoundException } from '@nestjs/common';
import { GroupBuyService } from './group-buy.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { InitiateGroupDto, JoinGroupDto } from './dto/join-group.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '@prisma/client';

@Controller('group-buy')
export class GroupBuyController {
  constructor(private readonly groupBuyService: GroupBuyService) {}

  @Get('activities')
  async listActivities(@Query('page') page = '1', @Query('pageSize') pageSize = '20') {
    return this.groupBuyService.listActivities(+page, +pageSize);
  }

  @Get('activities/:id')
  async getActivity(@Param('id') id: string) {
    const result = await this.groupBuyService.getActivity(id);
    if (!result) throw new NotFoundException('活动不存在');
    return result;
  }

  @Post('activities')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'AGENT_L1')
  async createActivity(@Body() dto: CreateActivityDto) {
    return this.groupBuyService.createActivity(dto);
  }

  @Put('activities/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'AGENT_L1')
  async updateActivity(@Param('id') id: string, @Body() body: { status?: string }) {
    return this.groupBuyService.updateActivity(id, body);
  }

  @Post('initiate')
  @UseGuards(JwtAuthGuard)
  async initiateGroup(@CurrentUser() user: User, @Body() dto: InitiateGroupDto) {
    try {
      return await this.groupBuyService.initiateGroup(user.id, dto);
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }

  @Post('join')
  @UseGuards(JwtAuthGuard)
  async joinGroup(@CurrentUser() user: User, @Body() dto: JoinGroupDto) {
    try {
      return await this.groupBuyService.joinGroup(user.id, dto);
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }

  @Get('my-groups')
  @UseGuards(JwtAuthGuard)
  async myGroups(@CurrentUser() user: User, @Query('page') page = '1', @Query('pageSize') pageSize = '20') {
    return this.groupBuyService.getMyGroups(user.id, +page, +pageSize);
  }

  @Get('group/:id')
  @UseGuards(JwtAuthGuard)
  async getGroup(@Param('id') id: string) {
    const result = await this.groupBuyService.getGroupDetail(id);
    if (!result) throw new NotFoundException('拼团不存在');
    return result;
  }
}
