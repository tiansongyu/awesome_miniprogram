import client from './client';

export async function getOrders(params: { page?: number; pageSize?: number; status?: string }) {
  const res = await client.get('/orders', { params });
  return res as unknown as { items: unknown[]; total: number; page: number; pageSize: number };
}

export async function getOrderDetail(id: string) {
  const res = await client.get(`/orders/${id}`);
  return res as unknown as Record<string, unknown>;
}

export async function updateOrderStatus(id: string, status: string) {
  const res = await client.put(`/orders/${id}/status`, { status });
  return res as unknown as Record<string, unknown>;
}
