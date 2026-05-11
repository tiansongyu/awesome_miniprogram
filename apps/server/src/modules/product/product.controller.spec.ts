import { Test, TestingModule } from '@nestjs/testing';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { ProductStatus, PriceType } from '@prisma/client';

describe('ProductController', () => {
  let controller: ProductController;
  let productService: ProductService;

  const mockProductService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateStatus: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductController],
      providers: [
        { provide: ProductService, useValue: mockProductService },
      ],
    }).compile();

    controller = module.get<ProductController>(ProductController);
    productService = module.get<ProductService>(ProductService);

    jest.clearAllMocks();
  });

  describe('GET /products', () => {
    it('should return paginated product list', async () => {
      const mockResult = {
        items: [{ id: 'prod-1', name: '商品1' }],
        total: 1,
        page: 1,
        pageSize: 20,
      };
      mockProductService.findAll.mockResolvedValue(mockResult);

      const result = await controller.findAll('1', '20');

      expect(result).toEqual(mockResult);
      expect(mockProductService.findAll).toHaveBeenCalledWith({
        page: 1,
        pageSize: 20,
        categoryId: undefined,
        status: undefined,
        keyword: undefined,
      });
    });

    it('should pass query filters to service', async () => {
      const mockResult = { items: [], total: 0, page: 1, pageSize: 20 };
      mockProductService.findAll.mockResolvedValue(mockResult);

      await controller.findAll('1', '20', 'cat-1', ProductStatus.ON_SALE, '关键词');

      expect(mockProductService.findAll).toHaveBeenCalledWith({
        page: 1,
        pageSize: 20,
        categoryId: 'cat-1',
        status: ProductStatus.ON_SALE,
        keyword: '关键词',
      });
    });

    it('should use default pagination when not provided', async () => {
      const mockResult = { items: [], total: 0, page: 1, pageSize: 20 };
      mockProductService.findAll.mockResolvedValue(mockResult);

      await controller.findAll();

      expect(mockProductService.findAll).toHaveBeenCalledWith({
        page: undefined,
        pageSize: undefined,
        categoryId: undefined,
        status: undefined,
        keyword: undefined,
      });
    });
  });

  describe('GET /products/:id', () => {
    it('should return a product by id', async () => {
      const mockProduct = { id: 'prod-1', name: '商品1', skus: [], category: {} };
      mockProductService.findOne.mockResolvedValue(mockProduct);

      const result = await controller.findOne('prod-1');

      expect(result).toEqual(mockProduct);
      expect(mockProductService.findOne).toHaveBeenCalledWith('prod-1');
    });
  });

  describe('POST /products', () => {
    it('should create a product', async () => {
      const dto = {
        name: '新商品',
        description: '描述',
        detail: '详情',
        images: ['img1.jpg'],
        categoryId: 'cat-1',
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
      mockProductService.create.mockResolvedValue(mockProduct);

      const result = await controller.create(dto);

      expect(result).toEqual(mockProduct);
      expect(mockProductService.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('PUT /products/:id', () => {
    it('should update a product', async () => {
      const dto = { name: '更新名称' };
      const mockProduct = { id: 'prod-1', name: '更新名称', skus: [], category: {} };
      mockProductService.update.mockResolvedValue(mockProduct);

      const result = await controller.update('prod-1', dto);

      expect(result).toEqual(mockProduct);
      expect(mockProductService.update).toHaveBeenCalledWith('prod-1', dto);
    });
  });

  describe('DELETE /products/:id', () => {
    it('should delete a product', async () => {
      const mockProduct = { id: 'prod-1', name: '商品1' };
      mockProductService.delete.mockResolvedValue(mockProduct);

      const result = await controller.delete('prod-1');

      expect(result).toEqual(mockProduct);
      expect(mockProductService.delete).toHaveBeenCalledWith('prod-1');
    });
  });
});
