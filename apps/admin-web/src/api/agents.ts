import client from './client';

export async function getAgents(params: { page?: number; pageSize?: number }) {
  const res = await client.get('/agents', { params });
  return res as unknown as { list: Agent[]; total: number };
}

export async function getAgentTree() {
  const res = await client.get('/agents/tree');
  return res as unknown as AgentTreeNode[];
}

export async function createAgent(data: { phone: string; nickname: string; password?: string; role: string }) {
  const res = await client.post('/agents', data);
  return res as unknown as Agent;
}

export async function updateAgent(id: string, data: { nickname?: string; frozen?: boolean }) {
  const res = await client.put(`/agents/${id}`, data);
  return res as unknown as Agent;
}

export async function freezeAgent(id: string) {
  const res = await client.post(`/agents/${id}/freeze`);
  return res;
}

export async function unfreezeAgent(id: string) {
  const res = await client.post(`/agents/${id}/unfreeze`);
  return res;
}

export async function getAgentStats(id: string) {
  const res = await client.get(`/agents/${id}/stats`);
  return res as unknown as AgentStats;
}

export interface Agent {
  id: string;
  phone: string;
  nickname: string;
  role: 'AGENT_L1' | 'AGENT_L2' | 'AGENT_L3';
  frozen: boolean;
  subAgentCount: number;
  balance: number;
  createdAt: string;
}

export interface AgentTreeNode {
  id: string;
  nickname: string;
  role: 'AGENT_L1' | 'AGENT_L2' | 'AGENT_L3';
  frozen: boolean;
  children?: AgentTreeNode[];
}

export interface AgentStats {
  customerCount: number;
  subAgentCount: number;
  totalProfit: number;
}
