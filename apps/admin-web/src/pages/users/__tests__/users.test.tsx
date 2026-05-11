import { render, screen, waitFor, fireEvent, act, cleanup } from '@testing-library/react';
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

vi.mock('../../../api/users', () => ({
  getUsers: vi.fn().mockResolvedValue({
    list: [
      { id: 'u1', nickname: '张三', phone: '13800000001', role: 'CUSTOMER', memberLevel: 'BRONZE', frozen: false, balance: 100, createdAt: '2026-01-01' },
      { id: 'u2', nickname: '李四', phone: '13800000002', role: 'AGENT_L1', memberLevel: 'GOLD', frozen: true, balance: 500, createdAt: '2026-01-02' },
    ],
    total: 2,
  }),
  getUserDetail: vi.fn().mockResolvedValue({ id: 'u1', nickname: '张三' }),
  updateUserRole: vi.fn().mockResolvedValue({ id: 'u1', role: 'AGENT_L3' }),
  updateMemberLevel: vi.fn().mockResolvedValue({ id: 'u1', memberLevel: 'GOLD' }),
  freezeUser: vi.fn().mockResolvedValue({ id: 'u1', frozen: true }),
  unfreezeUser: vi.fn().mockResolvedValue({ id: 'u2', frozen: false }),
}));

import Users from '../index';

describe('Users Page', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { cleanup(); document.body.innerHTML = ''; });

  it('renders user list', async () => {
    await act(async () => { render(<Users />); });
    await waitFor(() => {
      expect(screen.getByText('张三')).toBeInTheDocument();
      expect(screen.getByText('李四')).toBeInTheDocument();
    });
  });

  it('shows role tags', async () => {
    await act(async () => { render(<Users />); });
    await waitFor(() => {
      expect(screen.getByText('普通用户')).toBeInTheDocument();
    });
  });

  it('shows freeze switch', async () => {
    await act(async () => { render(<Users />); });
    await waitFor(() => {
      const switches = document.querySelectorAll('.ant-switch');
      expect(switches.length).toBeGreaterThan(0);
    });
  });
});
