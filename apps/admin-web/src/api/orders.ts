import client from './client';

export async function getOrders(params: { page?: number; pageSize?: number; status?: string }) {
  const res = await client.get('/orders', { params });
  return res.data;
}

export async function getOrderDetail(id: string) {
  const res = await client.get(`/orders/${id}`);
  return res.data;
}

export async function updateOrderStatus(id: string, status: string) {
  const res = await client.put(`/orders/${id}/status`, { status });
  return res.data;
}
