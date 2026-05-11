import { Test, TestingModule } from '@nestjs/testing';
import { ProductService } from './product.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { ProductStatus, PriceType } from '@prisma/client';

describe('ProductService', () => {
  let service: ProductService;
  let prisma: PrismaService;

  const mockPrisma = {
    product: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    category: {
      findMany: jest.fn(),
    },
    sku: {
      findMany: jest.fn(),
    },
    skuPrice: {
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a product successfully', async () => {
      const dto = {
        name: '测试商品',
        description: '描述',
        detail: '详情',
        images: ['img1.jpg'],
        categoryId: 'cat-1',
        status: ProductStatus.DRAFT,
        skus: [
          {
            specs: { color: 'red' },
            stock: 100,
            costPrice: 10,
            prices: [{ priceType: PriceType.RETAIL, price: 20 }],
          },
        ],
      };

      const mockProduct = { id: 'prod-1', ...dto };
      mockPrisma.product.create.mockResolvedValue(mockProduct);

      const result = await service.create(dto);

      expect(result).toEqual(mockProduct);
      expect(mockPrisma.product.create).toHaveBeenCalledWith({
        data: {
          name: dto.name,
          description: dto.description,
          detail: dto.detail,
          images: dto.images,
          categoryId: dto.categoryId,
          status: ProductStatus.DRAFT,
          skus: {
            create: [
              {
                specs: { color: 'red' },
                stock: 100,
                costPrice: 10,
                prices: {
                  create: [{ priceType: PriceType.RETAIL, price: 20 }],
                },
              },
            ],
          },
        },
        include: { skus: { include: { prices: true } } },
      });
    });
  });

  describe('findAll', () => {
    const mockProducts = [
      { id: 'prod-1', name: '商品1' },
      { id: 'prod-2', name: '商品2' },
    ];

    it('should return paginated results', async () => {
      mockPrisma.product.findMany.mockResolvedValue(mockProducts);
      mockPrisma.product.count.mockResolvedValue(2);

      const result = await service.findAll({ page: 1, pageSize: 10 });

      expect(result).toEqual({ items: mockProducts, total: 2, page: 1, pageSize: 10 });
      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 10 }),
      );
    });

    it('should filter by categoryId including descendants', async () => {
      mockPrisma.category.findMany.mockResolvedValue([]);
      mockPrisma.product.findMany.mockResolvedValue(mockProducts);
      mockPrisma.product.count.mockResolvedValue(2);

      const result = await service.findAll({ categoryId: 'cat-1' });

      expect(mockPrisma.category.findMany).toHaveBeenCalledWith({
        where: { parentId: 'cat-1' },
        select: { id: true },
      });
      expect(result.items).toEqual(mockProducts);
    });

    it('should filter by keyword', async () => {
      mockPrisma.product.findMany.mockResolvedValue([mockProducts[0]]);
      mockPrisma.product.count.mockResolvedValue(1);

      const result = await service.findAll({ keyword: '商品1' });

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            name: { contains: '商品1', mode: 'insensitive' },
          }),
        }),
      );
      expect(result.items).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('should return a product if found', async () => {
      const mockProduct = { id: 'prod-1', name: '商品1', skus: [], category: {} };
      mockPrisma.product.findUnique.mockResolvedValue(mockProduct);

      const result = await service.findOne('prod-1');

      expect(result).toEqual(mockProduct);
      expect(mockPrisma.product.findUnique).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        include: { skus: { include: { prices: true } }, category: true },
      });
    });

    it('should throw NotFoundException if product not found', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const existingProduct = { id: 'prod-1', name: '商品1', skus: [], category: {} };

    it('should update basic fields without SKUs', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(existingProduct);
      mockPrisma.product.update.mockResolvedValue({ ...existingProduct, name: '新名称' });

      // findOne is called twice: once to verify existence, once to return result
      mockPrisma.product.findUnique
        .mockResolvedValueOnce(existingProduct)
        .mockResolvedValueOnce({ ...existingProduct, name: '新名称' });

      const result = await service.update('prod-1', { name: '新名称' });

      expect(mockPrisma.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        data: { name: '新名称' },
      });
    });

    it('should update with SKUs using transaction', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(existingProduct);

      const mockTx = {
        sku: { findMany: jest.fn().mockResolvedValue([{ id: 'sku-1' }]), deleteMany: jest.fn() },
        skuPrice: { deleteMany: jest.fn() },
        product: { update: jest.fn() },
      };
      mockPrisma.$transaction.mockImplementation(async (cb) => cb(mockTx));

      // For the final findOne call
      mockPrisma.product.findUnique
        .mockResolvedValueOnce(existingProduct)
        .mockResolvedValueOnce(existingProduct);

      const dto = {
        name: '新名称',
        skus: [
          {
            specs: { size: 'L' },
            stock: 50,
            costPrice: 15,
            prices: [{ priceType: PriceType.RETAIL, price: 30 }],
          },
        ],
      };

      await service.update('prod-1', dto);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockTx.skuPrice.deleteMany).toHaveBeenCalledWith({ where: { skuId: 'sku-1' } });
      expect(mockTx.sku.deleteMany).toHaveBeenCalledWith({ where: { productId: 'prod-1' } });
      expect(mockTx.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        data: expect.objectContaining({
          name: '新名称',
          skus: {
            create: [
              expect.objectContaining({
                specs: { size: 'L' },
                stock: 50,
                costPrice: 15,
              }),
            ],
          },
        }),
      });
    });
  });

  describe('updateStatus', () => {
    it('should update product status', async () => {
      const existingProduct = { id: 'prod-1', name: '商品1', skus: [], category: {} };
      mockPrisma.product.findUnique.mockResolvedValue(existingProduct);
      mockPrisma.product.update.mockResolvedValue({ ...existingProduct, status: ProductStatus.ON_SALE });

      const result = await service.updateStatus('prod-1', ProductStatus.ON_SALE);

      expect(mockPrisma.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        data: { status: ProductStatus.ON_SALE },
      });
    });
  });

  describe('delete', () => {
    it('should delete a product', async () => {
      const existingProduct = { id: 'prod-1', name: '商品1', skus: [], category: {} };
      mockPrisma.product.findUnique.mockResolvedValue(existingProduct);
      mockPrisma.product.delete.mockResolvedValue(existingProduct);

      const result = await service.delete('prod-1');

      expect(mockPrisma.product.delete).toHaveBeenCalledWith({ where: { id: 'prod-1' } });
    });

    it('should throw NotFoundException if product does not exist', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);

      await expect(service.delete('non-existent')).rejects.toThrow(NotFoundException);
    });
  });
});
