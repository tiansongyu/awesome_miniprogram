import { render, screen, waitFor, act, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../../api/stats', () => ({
  getStatsOverview: vi.fn().mockResolvedValue({
    totalUsers: 100, totalOrders: 50, totalRevenue: 10000,
    todayOrders: 5, todayRevenue: 500, totalProducts: 30,
    onSaleProducts: 25, totalAgents: 10,
  }),
}));

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false, media: query, onchange: null,
    addListener: vi.fn(), removeListener: vi.fn(),
    addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
  })),
});

import Dashboard from '../index';

describe('Dashboard Page', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { cleanup(); document.body.innerHTML = ''; });

  it('renders dashboard with statistics', async () => {
    await act(async () => { render(<Dashboard />); });
    await waitFor(() => {
      expect(screen.getByText('100')).toBeInTheDocument(); // totalUsers
    });
  });

  it('shows revenue data', async () => {
    await act(async () => { render(<Dashboard />); });
    await waitFor(() => {
      expect(screen.getByText(/10,?000/)).toBeInTheDocument();
    });
  });
});
