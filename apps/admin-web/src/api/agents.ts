import client from './client';

export const getAgents = (params?: Record<string, unknown>) =>
  client.get('/agents', { params });

export const getAgent = (id: number) =>
  client.get(`/agents/${id}`);

export const createAgent = (data: Record<string, unknown>) =>
  client.post('/agents', data);

export const updateAgent = (id: number, data: Record<string, unknown>) =>
  client.put(`/agents/${id}`, data);

export const deleteAgent = (id: number) =>
  client.delete(`/agents/${id}`);
