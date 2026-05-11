import { Controller, Get, Put, Post, Param, Query, Body, UseGuards } from '@nestjs/common';
import { MessageService } from './message.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { SendMessageDto } from './dto/send-message.dto';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessageController {
  constructor(private messageService: MessageService) {}

  @Get()
  async list(
    @CurrentUser('id') userId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.messageService.list(
      userId,
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : 20,
    );
  }

  @Get('unread-count')
  async unreadCount(@CurrentUser('id') userId: string) {
    return this.messageService.unreadCount(userId);
  }

  @Put(':id/read')
  async markAsRead(
    @CurrentUser('id') userId: string,
    @Param('id') messageId: string,
  ) {
    return this.messageService.markAsRead(userId, messageId);
  }

  @Put('read-all')
  async markAllAsRead(@CurrentUser('id') userId: string) {
    return this.messageService.markAllAsRead(userId);
  }

  @Post('send')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  async send(@Body() dto: SendMessageDto) {
    return this.messageService.send(dto);
  }
}
