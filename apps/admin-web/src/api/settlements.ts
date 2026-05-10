import client from './client';

export const getSettlements = (params?: { page?: number; pageSize?: number }) =>
  client.get('/settlements', { params });

export const getSettlementStats = () =>
  client.get('/settlements/stats');

export const getSettlement = (id: number) =>
  client.get(`/settlements/${id}`);

export const updateSettlement = (id: number, data: Record<string, unknown>) =>
  client.put(`/settlements/${id}`, data);
