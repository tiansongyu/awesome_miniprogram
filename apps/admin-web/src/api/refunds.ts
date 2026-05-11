import client from './client';

export interface Refund {
  id: string;
  orderNo: string;
  userNickname: string;
  reason: string;
  amount: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  createdAt: string;
}

export async function getRefunds(params: { page?: number; pageSize?: number; status?: string }) {
  const res = await client.get('/refunds/admin', { params });
  return res as unknown as { items: Refund[]; total: number; page: number; pageSize: number };
}

export async function approveRefund(id: string) {
  const res = await client.put(`/refunds/${id}/approve`);
  return res as unknown as Record<string, unknown>;
}

export async function rejectRefund(id: string, remark: string) {
  const res = await client.put(`/refunds/${id}/reject`, { remark });
  return res as unknown as Record<string, unknown>;
}
