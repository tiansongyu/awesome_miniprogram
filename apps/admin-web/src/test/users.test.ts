import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../api/users', () => ({
  getUsers: vi.fn().mockResolvedValue({
    items: [
      { id: '1', nickname: '测试用户', phone: '13800000001', role: 'CUSTOMER', memberLevel: 'BRONZE', frozen: false, balance: 0, createdAt: '2026-01-01' },
    ],
    total: 1,
    page: 1,
    pageSize: 20,
  }),
  getUserDetail: vi.fn().mockResolvedValue({
    id: '1',
    nickname: '测试用户',
    phone: '13800000001',
    role: 'CUSTOMER',
    memberLevel: 'BRONZE',
    frozen: false,
  }),
  updateUserRole: vi.fn().mockResolvedValue({ id: '1', nickname: '测试用户', role: 'AGENT_L3' }),
  updateMemberLevel: vi.fn().mockResolvedValue({ id: '1', nickname: '测试用户', memberLevel: 'GOLD' }),
  freezeUser: vi.fn().mockResolvedValue({ id: '1', nickname: '测试用户', frozen: true }),
  unfreezeUser: vi.fn().mockResolvedValue({ id: '1', nickname: '测试用户', frozen: false }),
}));

import { getUsers, getUserDetail, updateUserRole, updateMemberLevel, freezeUser, unfreezeUser } from '../api/users';

describe('Users API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getUsers should return paginated data', async () => {
    const result = await getUsers({ page: 1, pageSize: 20 });
    expect(result).toHaveProperty('items');
    expect(result).toHaveProperty('total', 1);
    expect(result.items[0]).toHaveProperty('id', '1');
  });

  it('getUserDetail should return user info', async () => {
    const result = await getUserDetail('1');
    expect(result).toHaveProperty('id', '1');
    expect(result).toHaveProperty('nickname', '测试用户');
  });

  it('updateUserRole should change role', async () => {
    const result = await updateUserRole('1', 'AGENT_L3');
    expect(result).toHaveProperty('role', 'AGENT_L3');
  });

  it('updateMemberLevel should change level', async () => {
    const result = await updateMemberLevel('1', 'GOLD');
    expect(result).toHaveProperty('memberLevel', 'GOLD');
  });

  it('freezeUser should freeze user', async () => {
    const result = await freezeUser('1');
    expect(result).toHaveProperty('frozen', true);
  });

  it('unfreezeUser should unfreeze user', async () => {
    const result = await unfreezeUser('1');
    expect(result).toHaveProperty('frozen', false);
  });
});
