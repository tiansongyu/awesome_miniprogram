import { render, screen, waitFor, act, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../../api/agents', () => ({
  getAgents: vi.fn().mockResolvedValue({
    items: [
      { id: 'a1', phone: '13800000001', nickname: '张三', role: 'AGENT_L1', frozen: false, subAgentCount: 5, balance: 1000, createdAt: '2026-01-01' },
      { id: 'a2', phone: '13800000002', nickname: '李四', role: 'AGENT_L2', frozen: true, subAgentCount: 2, balance: 500, createdAt: '2026-02-01' },
      { id: 'a3', phone: '13800000003', nickname: '王五', role: 'AGENT_L3', frozen: false, subAgentCount: 0, balance: 200, createdAt: '2026-03-01' },
    ],
    total: 3,
  }),
  getAgentTree: vi.fn().mockResolvedValue([]),
  createAgent: vi.fn().mockResolvedValue({ id: 'a-new' }),
  updateAgent: vi.fn().mockResolvedValue({ id: 'a1' }),
  freezeAgent: vi.fn().mockResolvedValue({}),
  unfreezeAgent: vi.fn().mockResolvedValue({}),
  getAgentStats: vi.fn().mockResolvedValue({ customerCount: 10, subAgentCount: 3, totalProfit: 5000 }),
}));

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false, media: query, onchange: null,
    addListener: vi.fn(), removeListener: vi.fn(),
    addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
  })),
});

import Agents from '../index';

describe('Agents Page', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { cleanup(); document.body.innerHTML = ''; });

  it('renders agent list', async () => {
    await act(async () => { render(<Agents />); });
    await waitFor(() => {
      expect(screen.getByText('张三')).toBeInTheDocument();
      expect(screen.getByText('李四')).toBeInTheDocument();
      expect(screen.getByText('王五')).toBeInTheDocument();
    });
  });

  it('displays agent role tags', async () => {
    await act(async () => { render(<Agents />); });
    await waitFor(() => {
      expect(screen.getByText('一级代理')).toBeInTheDocument();
      expect(screen.getByText('二级代理')).toBeInTheDocument();
      expect(screen.getByText('三级代理')).toBeInTheDocument();
    });
  });

  it('shows statistics links for agents', async () => {
    await act(async () => { render(<Agents />); });
    await waitFor(() => {
      const statsLinks = screen.getAllByText('查看统计');
      expect(statsLinks.length).toBeGreaterThanOrEqual(1);
    });
  });
});
