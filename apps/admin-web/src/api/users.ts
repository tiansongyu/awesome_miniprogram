import client from './client';

export interface User {
  id: string;
  nickname: string;
  avatar: string;
  phone: string;
  role: string;
  memberLevel: string;
  frozen: boolean;
  balance: number;
  createdAt: string;
}

export async function getUsers(params: { page?: number; pageSize?: number; role?: string }) {
  return client.get('/users', { params });
}

export async function getUserDetail(id: string) {
  return client.get(`/users/${id}`);
}

export async function updateUserRole(id: string, role: string) {
  return client.put(`/users/${id}/role`, { role });
}

export async function updateMemberLevel(id: string, memberLevel: string) {
  return client.put(`/users/${id}/member-level`, { memberLevel });
}

export async function freezeUser(id: string) {
  return client.put(`/users/${id}/freeze`);
}

export async function unfreezeUser(id: string) {
  return client.put(`/users/${id}/unfreeze`);
}
