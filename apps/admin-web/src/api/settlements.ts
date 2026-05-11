import client from './client';

export interface SettlementQueryParams {
  page?: number;
  pageSize?: number;
  status?: string;
}

export const getSettlements = (params?: SettlementQueryParams) =>
  client.get('/settlements', { params });

export const getSettlementStats = () =>
  client.get('/settlements/stats');

export const getSettlement = (id: string) =>
  client.get(`/settlements/${id}`);

export const updateSettlement = (id: string, data: Record<string, unknown>) =>
  client.put(`/settlements/${id}`, data);
