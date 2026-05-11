import { Test, TestingModule } from '@nestjs/testing';
import { FavoriteService } from './favorite.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('FavoriteService', () => {
  let service: FavoriteService;

  const mockPrisma = {
    favorite: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FavoriteService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<FavoriteService>(FavoriteService);

    jest.clearAllMocks();
  });

  describe('toggle', () => {
    it('should create favorite when not existing', async () => {
      mockPrisma.favorite.findUnique.mockResolvedValue(null);
      mockPrisma.favorite.create.mockResolvedValue({ id: 'fav-1', userId: 'user-1', productId: 'prod-1' });

      const result = await service.toggle('user-1', 'prod-1');

      expect(result).toEqual({ favorited: true });
      expect(mockPrisma.favorite.findUnique).toHaveBeenCalledWith({
        where: { userId_productId: { userId: 'user-1', productId: 'prod-1' } },
      });
      expect(mockPrisma.favorite.create).toHaveBeenCalledWith({
        data: { userId: 'user-1', productId: 'prod-1' },
      });
    });

    it('should delete favorite when already existing', async () => {
      const existing = { id: 'fav-1', userId: 'user-1', productId: 'prod-1' };
      mockPrisma.favorite.findUnique.mockResolvedValue(existing);
      mockPrisma.favorite.delete.mockResolvedValue(existing);

      const result = await service.toggle('user-1', 'prod-1');

      expect(result).toEqual({ favorited: false });
      expect(mockPrisma.favorite.delete).toHaveBeenCalledWith({
        where: { id: 'fav-1' },
      });
      expect(mockPrisma.favorite.create).not.toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('should return paginated favorite list', async () => {
      const mockItems = [
        { id: 'fav-1', userId: 'user-1', productId: 'prod-1', product: { name: '商品A', skus: [] } },
      ];
      mockPrisma.favorite.findMany.mockResolvedValue(mockItems);
      mockPrisma.favorite.count.mockResolvedValue(1);

      const result = await service.list('user-1', 1, 20);

      expect(result).toEqual({ items: mockItems, total: 1, page: 1, pageSize: 20 });
      expect(mockPrisma.favorite.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
          skip: 0,
          take: 20,
        }),
      );
    });
  });

  describe('status', () => {
    it('should return favorited true when exists', async () => {
      mockPrisma.favorite.findUnique.mockResolvedValue({ id: 'fav-1' });

      const result = await service.status('user-1', 'prod-1');

      expect(result).toEqual({ favorited: true });
      expect(mockPrisma.favorite.findUnique).toHaveBeenCalledWith({
        where: { userId_productId: { userId: 'user-1', productId: 'prod-1' } },
      });
    });

    it('should return favorited false when not exists', async () => {
      mockPrisma.favorite.findUnique.mockResolvedValue(null);

      const result = await service.status('user-1', 'prod-1');

      expect(result).toEqual({ favorited: false });
    });
  });

  describe('remove', () => {
    it('should delete favorite and return success', async () => {
      mockPrisma.favorite.deleteMany.mockResolvedValue({ count: 1 });

      const result = await service.remove('user-1', 'prod-1');

      expect(result).toEqual({ success: true });
      expect(mockPrisma.favorite.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', productId: 'prod-1' },
      });
    });
  });
});
