import { useAuthStore } from './auth';

vi.mock('../utils/request', () => ({
  request: vi.fn(),
}));

import { request } from '../utils/request';
const mockedRequest = vi.mocked(request);

// Access the taro mock storage
import Taro from '@tarojs/taro';

describe('auth store', () => {
  beforeEach(() => {
    // Reset store state
    useAuthStore.setState({ token: null, user: null, isLoggedIn: false });
    // Clear storage
    Taro.removeStorageSync('token');
    Taro.removeStorageSync('refreshToken');
    vi.clearAllMocks();
  });

  describe('phoneLogin', () => {
    it('should store token after successful login', async () => {
      mockedRequest.mockResolvedValueOnce({
        accessToken: 'test-token',
        refreshToken: 'test-refresh-token',
      });

      await useAuthStore.getState().phoneLogin('13800000000', 'password123');

      expect(mockedRequest).toHaveBeenCalledWith({
        url: '/auth/login',
        method: 'POST',
        data: { phone: '13800000000', password: 'password123' },
      });
      expect(useAuthStore.getState().token).toBe('test-token');
      expect(useAuthStore.getState().isLoggedIn).toBe(true);
      expect(Taro.getStorageSync('token')).toBe('test-token');
      expect(Taro.getStorageSync('refreshToken')).toBe('test-refresh-token');
    });
  });

  describe('register', () => {
    it('should store token after successful registration', async () => {
      mockedRequest.mockResolvedValueOnce({
        accessToken: 'reg-token',
        refreshToken: 'reg-refresh-token',
      });

      await useAuthStore.getState().register('13800000000', 'password123', 'nickname', 'BIND001');

      expect(mockedRequest).toHaveBeenCalledWith({
        url: '/auth/register',
        method: 'POST',
        data: { phone: '13800000000', password: 'password123', nickname: 'nickname', bindCode: 'BIND001' },
      });
      expect(useAuthStore.getState().token).toBe('reg-token');
      expect(useAuthStore.getState().isLoggedIn).toBe(true);
      expect(Taro.getStorageSync('token')).toBe('reg-token');
    });
  });

  describe('logout', () => {
    it('should clear token and user', () => {
      // Set up logged-in state
      Taro.setStorageSync('token', 'existing-token');
      Taro.setStorageSync('refreshToken', 'existing-refresh');
      useAuthStore.setState({
        token: 'existing-token',
        user: { id: '1', nickname: 'test', avatar: '', phone: '13800000000', role: 'user', memberLevel: 'NORMAL', balance: '0', bindCode: null },
        isLoggedIn: true,
      });

      useAuthStore.getState().logout();

      expect(useAuthStore.getState().token).toBeNull();
      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().isLoggedIn).toBe(false);
      expect(Taro.getStorageSync('token')).toBe('');
      expect(Taro.getStorageSync('refreshToken')).toBe('');
    });
  });

  describe('fetchProfile', () => {
    it('should update user state with profile data', async () => {
      const mockProfile = {
        id: '1',
        nickname: 'TestUser',
        avatar: 'https://example.com/avatar.png',
        phone: '13800000000',
        role: 'agent',
        memberLevel: 'VIP',
        balance: '100.00',
        bindCode: 'ABC123',
      };
      mockedRequest.mockResolvedValueOnce(mockProfile);

      await useAuthStore.getState().fetchProfile();

      expect(mockedRequest).toHaveBeenCalledWith({ url: '/users/profile' });
      expect(useAuthStore.getState().user).toEqual(mockProfile);
    });
  });
});
