import client from './client';

export const getSettlements = (params?: Record<string, unknown>) =>
  client.get('/settlements', { params });

export const getSettlement = (id: number) =>
  client.get(`/settlements/${id}`);

export const updateSettlement = (id: number, data: Record<string, unknown>) =>
  client.put(`/settlements/${id}`, data);
