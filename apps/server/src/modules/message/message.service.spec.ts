import { Test, TestingModule } from '@nestjs/testing';
import { MessageService } from './message.service';
import { PrismaService } from '../../prisma/prisma.service';
import { MessageType } from '@prisma/client';

describe('MessageService', () => {
  let service: MessageService;
  let prisma: PrismaService;

  const mockPrisma = {
    message: {
      findMany: jest.fn(),
      count: jest.fn(),
      updateMany: jest.fn(),
      createMany: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessageService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<MessageService>(MessageService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('list', () => {
    it('should return paginated messages for user', async () => {
      const mockMessages = [
        { id: 'msg-1', userId: 'user-1', title: '通知', content: '内容', isRead: false },
      ];
      mockPrisma.message.findMany.mockResolvedValue(mockMessages);
      mockPrisma.message.count.mockResolvedValue(1);

      const result = await service.list('user-1', 1, 20);

      expect(result).toEqual({ items: mockMessages, total: 1, page: 1, pageSize: 20 });
      expect(mockPrisma.message.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
          skip: 0,
          take: 20,
        }),
      );
    });
  });

  describe('unreadCount', () => {
    it('should return unread message count', async () => {
      mockPrisma.message.count.mockResolvedValue(5);

      const result = await service.unreadCount('user-1');

      expect(result).toEqual({ count: 5 });
      expect(mockPrisma.message.count).toHaveBeenCalledWith({
        where: { userId: 'user-1', isRead: false },
      });
    });
  });

  describe('markAsRead', () => {
    it('should mark a single message as read', async () => {
      mockPrisma.message.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.markAsRead('user-1', 'msg-1');

      expect(result).toEqual({ success: true });
      expect(mockPrisma.message.updateMany).toHaveBeenCalledWith({
        where: { id: 'msg-1', userId: 'user-1' },
        data: { isRead: true },
      });
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all unread messages as read', async () => {
      mockPrisma.message.updateMany.mockResolvedValue({ count: 3 });

      const result = await service.markAllAsRead('user-1');

      expect(result).toEqual({ success: true });
      expect(mockPrisma.message.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', isRead: false },
        data: { isRead: true },
      });
    });
  });

  describe('send', () => {
    it('should send message to specified users', async () => {
      mockPrisma.message.createMany.mockResolvedValue({ count: 2 });

      const dto = {
        title: '促销通知',
        content: '全场五折',
        type: MessageType.SYSTEM,
        userIds: ['user-1', 'user-2'],
      };

      const result = await service.send(dto);

      expect(result).toEqual({ success: true, count: 2 });
      expect(mockPrisma.message.createMany).toHaveBeenCalledWith({
        data: [
          { userId: 'user-1', title: '促销通知', content: '全场五折', type: MessageType.SYSTEM },
          { userId: 'user-2', title: '促销通知', content: '全场五折', type: MessageType.SYSTEM },
        ],
      });
    });

    it('should send message to all users when userIds is not provided', async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'user-1' },
        { id: 'user-2' },
        { id: 'user-3' },
      ]);
      mockPrisma.message.createMany.mockResolvedValue({ count: 3 });

      const dto = {
        title: '系统公告',
        content: '系统维护通知',
      };

      const result = await service.send(dto);

      expect(result).toEqual({ success: true, count: 3 });
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        select: { id: true },
      });
      expect(mockPrisma.message.createMany).toHaveBeenCalledWith({
        data: [
          { userId: 'user-1', title: '系统公告', content: '系统维护通知', type: MessageType.SYSTEM },
          { userId: 'user-2', title: '系统公告', content: '系统维护通知', type: MessageType.SYSTEM },
          { userId: 'user-3', title: '系统公告', content: '系统维护通知', type: MessageType.SYSTEM },
        ],
      });
    });
  });
});
