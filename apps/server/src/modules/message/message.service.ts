import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SendMessageDto } from './dto/send-message.dto';
import { MessageType } from '@prisma/client';

@Injectable()
export class MessageService {
  constructor(private prisma: PrismaService) {}

  /** 获取用户消息列表（分页） */
  async list(userId: string, page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      this.prisma.message.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.message.count({ where: { userId } }),
    ]);

    return { items, total, page, pageSize };
  }

  /** 获取未读消息数量 */
  async unreadCount(userId: string) {
    const count = await this.prisma.message.count({
      where: { userId, isRead: false },
    });
    return { count };
  }

  /** 标记单条消息已读 */
  async markAsRead(userId: string, messageId: string) {
    await this.prisma.message.updateMany({
      where: { id: messageId, userId },
      data: { isRead: true },
    });
    return { success: true };
  }

  /** 全部标记已读 */
  async markAllAsRead(userId: string) {
    await this.prisma.message.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return { success: true };
  }

  /** 管理员发送消息给指定用户或全部用户 */
  async send(dto: SendMessageDto) {
    const { title, content, type = MessageType.SYSTEM, userIds } = dto;

    let targetUserIds: string[];

    if (userIds && userIds.length > 0) {
      targetUserIds = userIds;
    } else {
      // 发送给所有用户
      const users = await this.prisma.user.findMany({
        select: { id: true },
      });
      targetUserIds = users.map((u) => u.id);
    }

    const messages = targetUserIds.map((userId) => ({
      userId,
      title,
      content,
      type,
    }));

    await this.prisma.message.createMany({ data: messages });

    return { success: true, count: messages.length };
  }
}
