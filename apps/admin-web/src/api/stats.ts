import client from './client';

export interface StatsOverview {
  totalUsers: number;
  totalOrders: number;
  totalRevenue: number;
  todayOrders: number;
  todayRevenue: number;
  totalProducts: number;
  onSaleProducts: number;
  totalAgents: number;
}

export async function getStatsOverview(): Promise<StatsOverview> {
  const res = await client.get('/stats/overview');
  return res as unknown as StatsOverview;
}
