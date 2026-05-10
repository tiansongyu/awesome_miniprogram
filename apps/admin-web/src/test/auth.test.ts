import { describe, it, expect, beforeEach } from 'vitest';
import { loginApi } from '../api/auth';

describe('Auth API', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('loginApi should return tokens', async () => {
    const result = await loginApi({ phone: '13800000000', password: 'admin123' });
    expect(result).toHaveProperty('accessToken');
    expect(result).toHaveProperty('refreshToken');
    expect(result.accessToken).toBe('mock-token');
  });
});
