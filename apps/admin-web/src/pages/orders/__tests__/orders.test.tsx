import { render, screen, waitFor, act, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

vi.mock('../../../api/orders', () => ({
  getOrders: vi.fn().mockResolvedValue({
    items: [
      { id: 'o1', orderNo: 'ORD001', userId: 'u1', user: { id: 'u1', nickname: '张三', phone: '138' }, totalAmount: 299, status: 'PAID', createdAt: '2026-01-01', items: [{ id: 'i1', skuName: '商品A', specs: '红色', quantity: 1, unitPrice: 299 }] },
    ],
    total: 1, page: 1, pageSize: 20,
  }),
  getOrderDetail: vi.fn().mockResolvedValue({ id: 'o1', orderNo: 'ORD001', status: 'PAID', items: [] }),
  updateOrderStatus: vi.fn().mockResolvedValue({ id: 'o1', status: 'SHIPPED' }),
}));

import Orders from '../index';

describe('Orders Page', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { cleanup(); document.body.innerHTML = ''; });

  it('renders order list', async () => {
    await act(async () => { render(<Orders />); });
    await waitFor(() => {
      expect(screen.getByText('ORD001')).toBeInTheDocument();
    });
  });

  it('shows status tabs', async () => {
    await act(async () => { render(<Orders />); });
    await waitFor(() => {
      expect(screen.getByText('全部')).toBeInTheDocument();
      expect(screen.getByText('待支付')).toBeInTheDocument();
    });
  });

  it('shows action buttons for PAID orders', async () => {
    await act(async () => { render(<Orders />); });
    await waitFor(() => {
      expect(screen.getByText('发货')).toBeInTheDocument();
    });
  });
});
