import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../api/orders', () => ({
  getOrders: vi.fn().mockResolvedValue({
    items: [
      { id: 'order-1', orderNo: 'ORD20260101001', userId: 'user-1', totalAmount: 199.00, status: 'PAID', createdAt: '2026-01-01', items: [{ id: 'item-1', skuName: '商品A', specs: '红色', quantity: 2, unitPrice: 99.5 }] },
    ],
    total: 1,
    page: 1,
    pageSize: 20,
  }),
  getOrderDetail: vi.fn().mockResolvedValue({
    id: 'order-1',
    orderNo: 'ORD20260101001',
    userId: 'user-1',
    totalAmount: 199.00,
    status: 'PAID',
    items: [{ id: 'item-1', skuName: '商品A', specs: '红色', quantity: 2, unitPrice: 99.5 }],
    settlements: [],
  }),
  updateOrderStatus: vi.fn().mockResolvedValue({ id: 'order-1', status: 'SHIPPED' }),
}));

import { getOrders, getOrderDetail, updateOrderStatus } from '../api/orders';

describe('Orders API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getOrders should return paginated items', async () => {
    const result = await getOrders({ page: 1, pageSize: 20 });
    expect(result).toHaveProperty('items');
    expect(result).toHaveProperty('total', 1);
    expect(result.items[0]).toHaveProperty('id', 'order-1');
    expect(result.items[0]).toHaveProperty('orderNo', 'ORD20260101001');
    expect(result.items[0]).toHaveProperty('status', 'PAID');
  });

  it('getOrders with status filter should succeed', async () => {
    const result = await getOrders({ page: 1, pageSize: 10, status: 'PAID' });
    expect(result).toHaveProperty('items');
  });

  it('getOrderDetail should return order with items', async () => {
    const result = await getOrderDetail('order-1');
    expect(result).toHaveProperty('id', 'order-1');
    expect(result).toHaveProperty('items');
    expect((result as any).items.length).toBe(1);
  });

  it('updateOrderStatus should change status', async () => {
    const result = await updateOrderStatus('order-1', 'SHIPPED');
    expect(result).toHaveProperty('status', 'SHIPPED');
  });
});
