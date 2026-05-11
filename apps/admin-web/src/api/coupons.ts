import client from './client';

export interface Coupon {
  id: string;
  name: string;
  type: 'FIXED' | 'PERCENT';
  value: number;
  minSpend: number;
  totalQty: number;
  usedQty: number;
  startTime: string;
  endTime: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
}

export interface CouponListParams {
  page?: number;
  pageSize?: number;
  status?: string;
  keyword?: string;
}

export interface CouponListResult {
  items: Coupon[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CouponCreateData {
  name: string;
  type: 'FIXED' | 'PERCENT';
  value: number;
  minSpend: number;
  totalQty: number;
  startTime: string;
  endTime: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export async function getCoupons(params: CouponListParams): Promise<CouponListResult> {
  const res = await client.get('/coupons', { params });
  return res as unknown as CouponListResult;
}

export async function createCoupon(data: CouponCreateData): Promise<Coupon> {
  const res = await client.post('/coupons', data);
  return res as unknown as Coupon;
}

export async function updateCoupon(id: string, data: Partial<CouponCreateData>): Promise<Coupon> {
  const res = await client.put(`/coupons/${id}`, data);
  return res as unknown as Coupon;
}
