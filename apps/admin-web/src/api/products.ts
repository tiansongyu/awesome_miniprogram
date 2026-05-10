import client from './client';

export const getProducts = (params?: Record<string, unknown>) =>
  client.get('/products', { params });

export const getProduct = (id: number) =>
  client.get(`/products/${id}`);

export const createProduct = (data: Record<string, unknown>) =>
  client.post('/products', data);

export const updateProduct = (id: number, data: Record<string, unknown>) =>
  client.put(`/products/${id}`, data);

export const deleteProduct = (id: number) =>
  client.delete(`/products/${id}`);
