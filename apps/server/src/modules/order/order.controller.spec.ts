import { Test, TestingModule } from '@nestjs/testing';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { Role, OrderStatus, MemberLevel } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

describe('OrderController', () => {
  let controller: OrderController;
  let orderService: OrderService;

  const mockOrderService = {
    create: jest.fn(),
    findByUser: jest.fn(),
    findById: jest.fn(),
    cancelOrder: jest.fn(),
    updateStatus: jest.fn(),
    adminFindAll: jest.fn(),
  };

  const mockUser = {
    id: 'user-1',
    openId: 'open-1',
    nickname: '测试用户',
    avatar: '',
    phone: '13800000000',
    password: null,
    role: Role.CUSTOMER,
    memberLevel: MemberLevel.BRONZE,
    balance: new Decimal(0),
    points: 0,
    bindCode: 'CODE1',
    parentAgentId: 'agent-1',
    isFrozen: false,
    frozen: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrderController],
      providers: [
        { provide: OrderService, useValue: mockOrderService },
      ],
    }).compile();

    controller = module.get<OrderController>(OrderController);
    orderService = module.get<OrderService>(OrderService);

    jest.clearAllMocks();
  });

  describe('POST /orders', () => {
    it('should create an order', async () => {
      const dto = {
        items: [{ skuId: 'sku-1', quantity: 2 }],
        remark: '备注',
      };
      const mockOrder = {
        id: 'order-1',
        orderNo: 'ORD001',
        userId: mockUser.id,
        totalAmount: new Decimal(100),
        status: OrderStatus.PENDING,
        items: [],
      };
      mockOrderService.create.mockResolvedValue(mockOrder);

      const result = await controller.create(mockUser, dto);

      expect(result).toEqual(mockOrder);
      expect(mockOrderService.create).toHaveBeenCalledWith(mockUser, dto);
    });
  });

  describe('GET /orders', () => {
    it('should return user orders with default pagination', async () => {
      const mockResult = {
        items: [{ id: 'order-1', items: [] }],
        total: 1,
        page: 1,
        pageSize: 20,
      };
      mockOrderService.findByUser.mockResolvedValue(mockResult);

      const result = await controller.findMyOrders(mockUser);

      expect(result).toEqual(mockResult);
      expect(mockOrderService.findByUser).toHaveBeenCalledWith(
        mockUser.id,
        undefined,
        undefined,
        undefined,
      );
    });

    it('should pass status and pagination params', async () => {
      const mockResult = { items: [], total: 0, page: 2, pageSize: 10 };
      mockOrderService.findByUser.mockResolvedValue(mockResult);

      const result = await controller.findMyOrders(
        mockUser,
        OrderStatus.PAID,
        '2',
        '10',
      );

      expect(mockOrderService.findByUser).toHaveBeenCalledWith(
        mockUser.id,
        OrderStatus.PAID,
        2,
        10,
      );
    });
  });

  describe('GET /orders/:id', () => {
    it('should return order detail', async () => {
      const mockOrder = {
        id: 'order-1',
        orderNo: 'ORD001',
        userId: mockUser.id,
        items: [],
        settlements: [],
      };
      mockOrderService.findById.mockResolvedValue(mockOrder);

      const result = await controller.findOne('order-1', mockUser);

      expect(result).toEqual(mockOrder);
      expect(mockOrderService.findById).toHaveBeenCalledWith('order-1', mockUser.id);
    });
  });

  describe('PUT /orders/:id/cancel', () => {
    it('should cancel an order', async () => {
      mockOrderService.cancelOrder.mockResolvedValue({ success: true });

      const result = await controller.cancel('order-1', mockUser);

      expect(result).toEqual({ success: true });
      expect(mockOrderService.cancelOrder).toHaveBeenCalledWith('order-1', mockUser.id);
    });
  });

  describe('PUT /orders/:id/status', () => {
    it('should update order status', async () => {
      const updatedOrder = {
        id: 'order-1',
        status: OrderStatus.PAID,
      };
      mockOrderService.updateStatus.mockResolvedValue(updatedOrder);

      const result = await controller.updateStatus('order-1', OrderStatus.PAID);

      expect(result).toEqual(updatedOrder);
      expect(mockOrderService.updateStatus).toHaveBeenCalledWith(
        'order-1',
        OrderStatus.PAID,
      );
    });
  });

  describe('GET /orders/admin', () => {
    it('should return all orders for admin', async () => {
      const mockResult = {
        items: [{ id: 'order-1', items: [], user: { id: 'u1', nickname: 'test', phone: '138' } }],
        total: 1,
        page: 1,
        pageSize: 20,
      };
      mockOrderService.adminFindAll.mockResolvedValue(mockResult);

      const result = await controller.adminFindAll();

      expect(result).toEqual(mockResult);
      expect(mockOrderService.adminFindAll).toHaveBeenCalledWith({
        status: undefined,
        page: undefined,
        pageSize: undefined,
      });
    });

    it('should pass query params to adminFindAll', async () => {
      const mockResult = { items: [], total: 0, page: 1, pageSize: 10 };
      mockOrderService.adminFindAll.mockResolvedValue(mockResult);

      const result = await controller.adminFindAll(OrderStatus.SHIPPED, '1', '10');

      expect(mockOrderService.adminFindAll).toHaveBeenCalledWith({
        status: OrderStatus.SHIPPED,
        page: 1,
        pageSize: 10,
      });
    });
  });
});
