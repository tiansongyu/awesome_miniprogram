import { describe, it, expect, beforeEach } from 'vitest';
import {
  getAgents,
  getAgentTree,
  getAgentStats,
  createAgent,
  updateAgent,
  freezeAgent,
  unfreezeAgent,
} from '../api/agents';

describe('Agents API', () => {
  beforeEach(() => {
    localStorage.setItem('accessToken', 'mock-token');
  });

  it('getAgents should return paginated items', async () => {
    const result = await getAgents({ page: 1, pageSize: 20 });
    expect(result).toHaveProperty('items');
    expect(result).toHaveProperty('total', 1);
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items[0]).toHaveProperty('id', 'agent-1');
    expect(result.items[0]).toHaveProperty('phone', '13900001111');
    expect(result.items[0]).toHaveProperty('role', 'AGENT_L1');
  });

  it('getAgentTree should return tree nodes', async () => {
    const result = await getAgentTree();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty('id', 'agent-1');
    expect(result[0]).toHaveProperty('nickname', '代理1');
    expect(result[0]).toHaveProperty('children');
  });

  it('getAgentStats should return statistics', async () => {
    const result = await getAgentStats('agent-1');
    expect(result).toHaveProperty('customerCount', 5);
    expect(result).toHaveProperty('subAgentCount', 3);
    expect(result).toHaveProperty('totalProfit', 1000);
  });

  it('createAgent should return new agent', async () => {
    const result = await createAgent({
      phone: '13900005555',
      nickname: '新代理',
      role: 'AGENT_L2',
    });
    expect(result).toHaveProperty('id', 'agent-new');
    expect(result).toHaveProperty('phone', '13900005555');
    expect(result).toHaveProperty('nickname', '新代理');
    expect(result).toHaveProperty('role', 'AGENT_L2');
  });

  it('createAgent with password should succeed', async () => {
    const result = await createAgent({
      phone: '13900006666',
      nickname: '密码代理',
      role: 'AGENT_L1',
      password: 'pass123',
    });
    expect(result).toHaveProperty('id', 'agent-new');
  });

  it('updateAgent should return updated agent', async () => {
    const result = await updateAgent('agent-1', { nickname: '新昵称' });
    expect(result).toHaveProperty('id', 'agent-1');
    expect(result).toHaveProperty('nickname', '新昵称');
  });

  it('freezeAgent should succeed', async () => {
    const result = await freezeAgent('agent-1');
    expect(result).toBeDefined();
  });

  it('unfreezeAgent should succeed', async () => {
    const result = await unfreezeAgent('agent-1');
    expect(result).toBeDefined();
  });
});
