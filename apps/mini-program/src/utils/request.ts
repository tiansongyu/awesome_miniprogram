import Taro from '@tarojs/taro';

export const BASE_URL = 'http://localhost:3000';

interface ApiResponse<T = any> {
  code: number;
  data: T;
  message: string;
}

export async function request<T = any>(options: {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: any;
  header?: Record<string, string>;
}): Promise<T> {
  const token = Taro.getStorageSync('token');
  const header: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.header,
  };
  if (token) {
    header['Authorization'] = `Bearer ${token}`;
  }

  const res = await Taro.request<ApiResponse<T>>({
    url: `${BASE_URL}${options.url}`,
    method: options.method || 'GET',
    data: options.data,
    header,
    timeout: 15000,
  });

  if (res.statusCode === 401) {
    Taro.removeStorageSync('token');
    Taro.removeStorageSync('refreshToken');
    Taro.switchTab({ url: '/pages/profile/index' });
    throw new Error('未登录');
  }

  if (res.statusCode >= 400) {
    const msg = res.data?.message || '请求失败';
    Taro.showToast({ title: msg, icon: 'none' });
    throw new Error(msg);
  }

  if (res.data && typeof res.data === 'object' && 'code' in res.data) {
    if (res.data.code !== 0) {
      Taro.showToast({ title: res.data.message || '请求失败', icon: 'none' });
      throw new Error(res.data.message);
    }
    return res.data.data;
  }

  return res.data as unknown as T;
}
