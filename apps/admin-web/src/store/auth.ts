import { create } from 'zustand';
import { loginApi } from '../api/auth';

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: { phone: string } | null;
  login: (phone: string, password: string) => Promise<void>;
  logout: () => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('accessToken'),
  refreshToken: localStorage.getItem('refreshToken'),
  user: null,

  login: async (phone: string, password: string) => {
    const data = await loginApi({ phone, password });
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    set({
      token: data.accessToken,
      refreshToken: data.refreshToken,
      user: { phone },
    });
  },

  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    set({ token: null, refreshToken: null, user: null });
  },

  setTokens: (accessToken: string, refreshToken: string) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    set({ token: accessToken, refreshToken });
  },
}));
