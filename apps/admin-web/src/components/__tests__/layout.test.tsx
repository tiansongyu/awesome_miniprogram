import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminLayout from '../../layouts/AdminLayout';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: '/dashboard' }),
  };
});

const mockLogout = vi.fn();
const mockState = {
  user: { phone: '13800000000' },
  token: 'mock-token',
  refreshToken: 'mock-refresh',
  logout: mockLogout,
  login: vi.fn(),
  setTokens: vi.fn(),
};

vi.mock('../../store/auth', () => ({
  useAuthStore: (selector?: (s: Record<string, unknown>) => unknown) => {
    if (typeof selector === 'function') {
      return selector(mockState);
    }
    return mockState;
  },
}));

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

function renderLayout() {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <AdminLayout />
    </MemoryRouter>,
  );
}

describe('AdminLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders sidebar menu items', async () => {
    renderLayout();
    await waitFor(() => {
      expect(screen.getByText('商品管理')).toBeInTheDocument();
    });
    expect(screen.getByText('数据概览')).toBeInTheDocument();
    expect(screen.getByText('订单管理')).toBeInTheDocument();
    expect(screen.getByText('代理管理')).toBeInTheDocument();
    expect(screen.getByText('分类管理')).toBeInTheDocument();
    expect(screen.getByText('结算中心')).toBeInTheDocument();
  });

  it('navigates when clicking a menu item', async () => {
    renderLayout();
    await waitFor(() => {
      expect(screen.getByText('商品管理')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('商品管理'));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/products');
    });
  });

  it('renders the layout title', async () => {
    renderLayout();
    await waitFor(() => {
      expect(screen.getByText('管理后台')).toBeInTheDocument();
    });
  });
});
