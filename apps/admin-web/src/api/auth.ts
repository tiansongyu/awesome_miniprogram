import client from './client';

export interface LoginParams {
  phone: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export const loginApi = (params: LoginParams): Promise<AuthTokens> =>
  client.post('/auth/admin/login', params);

export const refreshTokenApi = (refreshToken: string): Promise<AuthTokens> =>
  client.post('/auth/refresh', { refreshToken });
