import { describe, it, expect, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from './mocks/server';
import client from '../api/client';

const BASE = 'http://localhost:3000';

describe('Client interceptors', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should attach Authorization header when token exists', async () => {
    localStorage.setItem('accessToken', 'my-token');
    server.use(
      http.get(`${BASE}/test-auth`, ({ request }) => {
        const auth = request.headers.get('Authorization');
        return HttpResponse.json({ code: 0, data: { auth }, message: 'success' });
      }),
    );
    const res = await client.get('/test-auth');
    expect((res as unknown as { auth: string }).auth).toBe('Bearer my-token');
  });

  it('should not attach Authorization header when no token', async () => {
    server.use(
      http.get(`${BASE}/test-no-auth`, ({ request }) => {
        const auth = request.headers.get('Authorization');
        return HttpResponse.json({ code: 0, data: { auth }, message: 'success' });
      }),
    );
    const res = await client.get('/test-no-auth');
    expect((res as unknown as { auth: string | null }).auth).toBeNull();
  });

  it('should unwrap response data when code is 0', async () => {
    localStorage.setItem('accessToken', 'token');
    server.use(
      http.get(`${BASE}/test-unwrap`, () => {
        return HttpResponse.json({ code: 0, data: { foo: 'bar' }, message: 'success' });
      }),
    );
    const res = await client.get('/test-unwrap');
    expect((res as unknown as { foo: string }).foo).toBe('bar');
  });

  it('should reject when code is not 0', async () => {
    localStorage.setItem('accessToken', 'token');
    server.use(
      http.get(`${BASE}/test-error`, () => {
        return HttpResponse.json({ code: 400, data: null, message: '参数错误' });
      }),
    );
    await expect(client.get('/test-error')).rejects.toThrow('参数错误');
  });

  it('should clear tokens and redirect on 401', async () => {
    localStorage.setItem('accessToken', 'expired-token');
    localStorage.setItem('refreshToken', 'old-refresh');

    const originalLocation = window.location.href;
    Object.defineProperty(window, 'location', {
      value: { ...window.location, href: originalLocation },
      writable: true,
    });

    server.use(
      http.get(`${BASE}/test-401`, () => {
        return new HttpResponse(null, { status: 401 });
      }),
    );

    await expect(client.get('/test-401')).rejects.toThrow();
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
  });
});
