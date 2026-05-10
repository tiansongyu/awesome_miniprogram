import { create } from 'zustand';
import Taro from '@tarojs/taro';
import { request } from '../utils/request';

interface UserProfile {
  id: string;
  nickname: string;
  avatar: string;
  phone: string;
  role: string;
  memberLevel: string;
  balance: string;
  bindCode: string | null;
}

interface AuthState {
  token: string | null;
  user: UserProfile | null;
  isLoggedIn: boolean;
  login: (code: string, bindCode?: string) => Promise<void>;
  logout: () => void;
  fetchProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: Taro.getStorageSync('token') || null,
  user: null,
  isLoggedIn: !!Taro.getStorageSync('token'),

  login: async (code: string, bindCode?: string) => {
    const data = await request<{ accessToken: string; refreshToken: string }>({
      url: '/auth/wechat/login',
      method: 'POST',
      data: { code, bindCode },
    });
    Taro.setStorageSync('token', data.accessToken);
    Taro.setStorageSync('refreshToken', data.refreshToken);
    set({ token: data.accessToken, isLoggedIn: true });
  },

  logout: () => {
    Taro.removeStorageSync('token');
    Taro.removeStorageSync('refreshToken');
    set({ token: null, user: null, isLoggedIn: false });
  },

  fetchProfile: async () => {
    const user = await request<UserProfile>({ url: '/users/profile' });
    set({ user });
  },
}));
