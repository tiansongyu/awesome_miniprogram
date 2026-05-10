import { describe, it, expect, beforeEach } from 'vitest';
import { getOrders, getOrderDetail, updateOrderStatus } from '../api/orders';

describe('Orders API', () => {
  beforeEach(() => {
    localStorage.setItem('accessToken', 'mock-token');
  });

  it('getOrders should return paginated items', async () => {
    const result = await getOrders({ page: 1, pageSize: 20 });
    expect(result).toHaveProperty('items');
    expect(result).toHaveProperty('total', 1);
    expect(result.items.length).toBeGreaterThan(0);
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
    expect(result).toHaveProperty('orderNo', 'ORD20260101001');
    expect(result).toHaveProperty('status', 'PAID');
    expect(result).toHaveProperty('items');
  });

  it('updateOrderStatus should change status', async () => {
    const result = await updateOrderStatus('order-1', 'SHIPPED');
    expect(result).toHaveProperty('id', 'order-1');
    expect(result).toHaveProperty('status', 'SHIPPED');
  });
});
