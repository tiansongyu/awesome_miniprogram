import { render, screen, waitFor, fireEvent, act, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../../api/coupons', () => ({
  getCoupons: vi.fn().mockResolvedValue({
    items: [
      { id: 'c1', name: '新人满减券', type: 'FIXED', value: 10, minSpend: 50, totalQty: 100, usedQty: 20, startTime: '2026-01-01', endTime: '2026-12-31', status: 'ACTIVE', createdAt: '2026-01-01' },
      { id: 'c2', name: '8折优惠券', type: 'PERCENT', value: 80, minSpend: 100, totalQty: 50, usedQty: 50, startTime: '2026-01-01', endTime: '2026-06-30', status: 'INACTIVE', createdAt: '2026-01-01' },
    ],
    total: 2, page: 1, pageSize: 20,
  }),
  createCoupon: vi.fn().mockResolvedValue({ id: 'c-new' }),
  updateCoupon: vi.fn().mockResolvedValue({ id: 'c1' }),
}));

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false, media: query, onchange: null,
    addListener: vi.fn(), removeListener: vi.fn(),
    addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
  })),
});

import Coupons from '../index';

describe('Coupons Page', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { cleanup(); document.body.innerHTML = ''; });

  it('renders coupon list', async () => {
    await act(async () => { render(<Coupons />); });
    await waitFor(() => {
      expect(screen.getByText('新人满减券')).toBeInTheDocument();
    });
  });

  it('renders add coupon button', async () => {
    await act(async () => { render(<Coupons />); });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /新增优惠券|新增/ })).toBeInTheDocument();
    });
  });

  it('shows coupon type tags', async () => {
    await act(async () => { render(<Coupons />); });
    await waitFor(() => {
      const elements = screen.getAllByText(/满减/);
      expect(elements.length).toBeGreaterThanOrEqual(1);
    });
  });
});
