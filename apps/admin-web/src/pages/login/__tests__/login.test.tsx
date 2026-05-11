import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Login from '../index';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockLogin = vi.fn();
const mockState = {
  login: mockLogin,
  token: null,
  refreshToken: null,
  user: null,
  logout: vi.fn(),
  setTokens: vi.fn(),
};

vi.mock('../../../store/auth', () => ({
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

function renderLogin() {
  return render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>,
  );
}

describe('Login Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLogin.mockReset();
  });

  it('renders phone and password inputs', () => {
    renderLogin();
    expect(screen.getByPlaceholderText('请输入手机号')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('请输入密码')).toBeInTheDocument();
  });

  it('renders the login button', () => {
    renderLogin();
    const loginBtn = screen.getByRole('button', { name: /登\s*录/ });
    expect(loginBtn).toBeInTheDocument();
  });

  it('renders the page title', () => {
    renderLogin();
    expect(screen.getByText('管理后台')).toBeInTheDocument();
  });

  it('calls login and navigates on success', async () => {
    mockLogin.mockResolvedValue(undefined);
    renderLogin();

    const phoneInput = screen.getByPlaceholderText('请输入手机号');
    const passwordInput = screen.getByPlaceholderText('请输入密码');

    await act(async () => {
      fireEvent.change(phoneInput, { target: { value: '13800000000' } });
      fireEvent.change(passwordInput, { target: { value: 'admin123' } });
    });

    const loginBtn = screen.getByRole('button', { name: /登\s*录/ });
    await act(async () => {
      fireEvent.click(loginBtn);
    });

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('13800000000', 'admin123');
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
    });
  });

  it('shows error message on login failure', async () => {
    mockLogin.mockRejectedValue(new Error('账号或密码错误'));
    renderLogin();

    const phoneInput = screen.getByPlaceholderText('请输入手机号');
    const passwordInput = screen.getByPlaceholderText('请输入密码');

    await act(async () => {
      fireEvent.change(phoneInput, { target: { value: '13800000000' } });
      fireEvent.change(passwordInput, { target: { value: 'wrongpass' } });
    });

    const loginBtn = screen.getByRole('button', { name: /登\s*录/ });
    await act(async () => {
      fireEvent.click(loginBtn);
    });

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('13800000000', 'wrongpass');
    });

    // Login failed so navigate should NOT have been called
    await waitFor(() => {
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});
