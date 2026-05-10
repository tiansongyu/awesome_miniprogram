import client from './client';

export const getUsers = (params?: Record<string, unknown>) =>
  client.get('/users', { params });

export const getMembers = (params?: { page?: number; pageSize?: number }) =>
  client.get('/users/customers', { params });

export const getUser = (id: number) =>
  client.get(`/users/${id}`);

export const updateUser = (id: number, data: Record<string, unknown>) =>
  client.put(`/users/${id}`, data);
