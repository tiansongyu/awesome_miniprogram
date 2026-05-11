import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserService } from './user.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { UpdateMemberLevelDto } from './dto/update-member-level.dto';
import { User, Role } from '@prisma/client';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UserController {
  constructor(private userService: UserService) {}

  // ========== Current user endpoints ==========

  @Get('profile')
  getProfile(@CurrentUser() user: User) {
    return this.userService.getProfile(user.id);
  }

  @Put('profile')
  updateProfile(@CurrentUser() user: User, @Body() dto: UpdateUserDto) {
    return this.userService.updateProfile(user.id, dto);
  }

  @Get('customers')
  listCustomers(
    @CurrentUser() user: User,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
  ) {
    return this.userService.listCustomers(user.id, page, pageSize);
  }

  // ========== Admin user management endpoints ==========

  @Get()
  @Roles(Role.SUPER_ADMIN)
  listUsers(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
    @Query('role') role?: Role,
  ) {
    return this.userService.listUsers(page, pageSize, role);
  }

  @Get(':id')
  @Roles(Role.SUPER_ADMIN)
  getUserDetail(@Param('id') id: string) {
    return this.userService.getUserDetail(id);
  }

  @Put(':id/role')
  @Roles(Role.SUPER_ADMIN)
  updateUserRole(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.userService.updateUserRole(id, dto.role);
  }

  @Put(':id/member-level')
  @Roles(Role.SUPER_ADMIN)
  updateMemberLevel(@Param('id') id: string, @Body() dto: UpdateMemberLevelDto) {
    return this.userService.updateMemberLevel(id, dto.memberLevel);
  }

  @Put(':id/freeze')
  @Roles(Role.SUPER_ADMIN)
  freezeUser(@Param('id') id: string) {
    return this.userService.freezeUser(id);
  }

  @Put(':id/unfreeze')
  @Roles(Role.SUPER_ADMIN)
  unfreezeUser(@Param('id') id: string) {
    return this.userService.unfreezeUser(id);
  }
}
