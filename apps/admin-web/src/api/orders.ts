import client from './client';

export const getOrders = (params?: Record<string, unknown>) =>
  client.get('/orders', { params });

export const getOrder = (id: number) =>
  client.get(`/orders/${id}`);

export const updateOrder = (id: number, data: Record<string, unknown>) =>
  client.put(`/orders/${id}`, data);
