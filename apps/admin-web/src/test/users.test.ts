import { describe, it, expect, beforeEach } from 'vitest';
import { getUsers, getMembers, getUser, updateUser } from '../api/users';

describe('Users API', () => {
  beforeEach(() => {
    localStorage.setItem('accessToken', 'mock-token');
  });

  it('getUsers should return data', async () => {
    const result = await getUsers();
    expect(result).toBeDefined();
  });

  it('getUsers with params should succeed', async () => {
    const result = await getUsers({ page: 1, pageSize: 10 });
    expect(result).toBeDefined();
  });

  it('getMembers should return data', async () => {
    const result = await getMembers({ page: 1, pageSize: 10 });
    expect(result).toBeDefined();
  });

  it('getUser should return single user', async () => {
    const result = await getUser(1);
    expect(result).toHaveProperty('id', '1');
    expect(result).toHaveProperty('nickname');
  });

  it('updateUser should return updated user', async () => {
    const result = await updateUser(1, { nickname: '新名字' });
    expect(result).toHaveProperty('id', '1');
  });
});
