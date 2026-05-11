import Taro from '@tarojs/taro';
import { request } from './request';

describe('request', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Taro.removeStorageSync('token');
    Taro.removeStorageSync('refreshToken');
  });

  it('should return data on successful request', async () => {
    vi.spyOn(Taro, 'request').mockResolvedValueOnce({
      statusCode: 200,
      data: { code: 0, data: { id: '1' }, message: 'ok' },
    } as any);

    const result = await request({ url: '/test' });

    expect(result).toEqual({ id: '1' });
  });

  it('should throw error on 401 status', async () => {
    vi.spyOn(Taro, 'request').mockResolvedValueOnce({
      statusCode: 401,
      data: { code: -1, data: null, message: '未登录' },
    } as any);

    await expect(request({ url: '/test' })).rejects.toThrow('未登录');
  });

  it('should throw error on 4xx status', async () => {
    vi.spyOn(Taro, 'request').mockResolvedValueOnce({
      statusCode: 400,
      data: { code: -1, data: null, message: '参数错误' },
    } as any);

    await expect(request({ url: '/test' })).rejects.toThrow('参数错误');
  });

  it('should include Authorization header when token exists', async () => {
    Taro.setStorageSync('token', 'my-token');

    const requestSpy = vi.spyOn(Taro, 'request').mockResolvedValueOnce({
      statusCode: 200,
      data: { code: 0, data: { id: '1' }, message: 'ok' },
    } as any);

    await request({ url: '/test' });

    expect(requestSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        header: expect.objectContaining({
          Authorization: 'Bearer my-token',
        }),
      })
    );
  });
});
