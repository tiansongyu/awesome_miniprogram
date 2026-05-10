import { http, HttpResponse } from 'msw';

const BASE = 'http://localhost:3000';

export const handlers = [
  // Auth
  http.post(`${BASE}/auth/admin/login`, () => {
    return HttpResponse.json({
      code: 0,
      data: { accessToken: 'mock-token', refreshToken: 'mock-refresh' },
      message: 'success',
    });
  }),

  // Categories
  http.get(`${BASE}/categories`, () => {
    return HttpResponse.json({
      code: 0,
      data: [
        { id: 'cat-1', name: '护肤品', parentId: null, sort: 1, createdAt: '2026-01-01T00:00:00Z', children: [] },
      ],
      message: 'success',
    });
  }),

  http.post(`${BASE}/categories`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json({
      code: 0,
      data: { id: 'cat-new', name: body.name, parentId: body.parentId || null, sort: body.sort || 0, createdAt: '2026-01-01T00:00:00Z', children: [] },
      message: 'success',
    });
  }),

  http.put(`${BASE}/categories/:id`, async ({ params, request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json({
      code: 0,
      data: { id: params.id, name: body.name || '更新分类', sort: body.sort || 1, createdAt: '2026-01-01T00:00:00Z' },
      message: 'success',
    });
  }),

  http.delete(`${BASE}/categories/:id`, ({ params }) => {
    return HttpResponse.json({
      code: 0,
      data: { id: params.id },
      message: 'success',
    });
  }),

  // Products
  http.get(`${BASE}/products`, ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '20');
    return HttpResponse.json({
      code: 0,
      data: {
        items: [
          { id: 'prod-1', name: '测试商品', description: '描述', categoryId: 'cat-1', images: ['https://img.test/a.jpg'], status: 'ON_SALE', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', skus: [] },
        ],
        total: 1,
        page,
        pageSize,
      },
      message: 'success',
    });
  }),

  http.post(`${BASE}/products`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json({
      code: 0,
      data: { id: 'prod-new', name: body.name, categoryId: body.categoryId, images: body.images, status: body.status, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', skus: [] },
      message: 'success',
    });
  }),

  http.put(`${BASE}/products/:id`, async ({ params, request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json({
      code: 0,
      data: { id: params.id, name: body.name || '商品', status: 'ON_SALE', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
      message: 'success',
    });
  }),

  http.put(`${BASE}/products/:id/status`, async ({ params, request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json({
      code: 0,
      data: { id: params.id, status: body.status, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
      message: 'success',
    });
  }),

  http.delete(`${BASE}/products/:id`, ({ params }) => {
    return HttpResponse.json({
      code: 0,
      data: { id: params.id, name: '已删除商品' },
      message: 'success',
    });
  }),

  // Agents
  http.get(`${BASE}/agents`, () => {
    return HttpResponse.json({
      code: 0,
      data: {
        items: [
          { id: 'agent-1', phone: '13900001111', nickname: '代理1', role: 'AGENT_L1', frozen: false, balance: 0, bindCode: 'ABC123', createdAt: '2026-01-01T00:00:00Z', _count: { children: 2 } },
        ],
        total: 1,
        page: 1,
        pageSize: 20,
      },
      message: 'success',
    });
  }),

  http.get(`${BASE}/agents/tree`, () => {
    return HttpResponse.json({
      code: 0,
      data: [
        { id: 'agent-1', nickname: '代理1', role: 'AGENT_L1', frozen: false, children: [] },
      ],
      message: 'success',
    });
  }),

  http.get(`${BASE}/agents/:id/stats`, () => {
    return HttpResponse.json({
      code: 0,
      data: { customerCount: 5, subAgentCount: 3, totalProfit: 1000 },
      message: 'success',
    });
  }),

  http.post(`${BASE}/agents`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json({
      code: 0,
      data: { id: 'agent-new', phone: body.phone, nickname: body.nickname, role: body.role, bindCode: 'NEW123', createdAt: '2026-01-01T00:00:00Z' },
      message: 'success',
    });
  }),

  http.put(`${BASE}/agents/:id`, async ({ params, request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json({
      code: 0,
      data: { id: params.id, nickname: body.nickname || '代理', role: 'AGENT_L1', frozen: false },
      message: 'success',
    });
  }),

  http.post(`${BASE}/agents/:id/freeze`, ({ params }) => {
    return HttpResponse.json({
      code: 0,
      data: { id: params.id, frozen: true },
      message: 'success',
    });
  }),

  http.post(`${BASE}/agents/:id/unfreeze`, ({ params }) => {
    return HttpResponse.json({
      code: 0,
      data: { id: params.id, frozen: false },
      message: 'success',
    });
  }),

  // Orders
  http.get(`${BASE}/orders`, () => {
    return HttpResponse.json({
      code: 0,
      data: {
        items: [
          { id: 'order-1', orderNo: 'ORD20260101001', status: 'PAID', totalAmount: 199, createdAt: '2026-01-01T00:00:00Z' },
        ],
        total: 1,
        page: 1,
        pageSize: 20,
      },
      message: 'success',
    });
  }),

  http.get(`${BASE}/orders/:id`, ({ params }) => {
    return HttpResponse.json({
      code: 0,
      data: { id: params.id, orderNo: 'ORD20260101001', status: 'PAID', totalAmount: 199, items: [], createdAt: '2026-01-01T00:00:00Z' },
      message: 'success',
    });
  }),

  http.put(`${BASE}/orders/:id/status`, async ({ params, request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json({
      code: 0,
      data: { id: params.id, status: body.status },
      message: 'success',
    });
  }),

  // Users
  http.get(`${BASE}/users`, () => {
    return HttpResponse.json({
      code: 0,
      data: [{ id: 'user-1', phone: '13800000001', nickname: '用户1', role: 'CUSTOMER' }],
      message: 'success',
    });
  }),

  http.get(`${BASE}/users/customers`, () => {
    return HttpResponse.json({
      code: 0,
      data: { items: [{ id: 'member-1', phone: '13800000002', nickname: '会员1', role: 'CUSTOMER' }], total: 1, page: 1, pageSize: 20 },
      message: 'success',
    });
  }),

  http.get(`${BASE}/users/:id`, ({ params }) => {
    return HttpResponse.json({
      code: 0,
      data: { id: params.id, phone: '13800000001', nickname: '用户1', role: 'CUSTOMER' },
      message: 'success',
    });
  }),

  http.put(`${BASE}/users/:id`, async ({ params, request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json({
      code: 0,
      data: { id: params.id, ...body },
      message: 'success',
    });
  }),

  // Settlements
  http.get(`${BASE}/settlements`, () => {
    return HttpResponse.json({
      code: 0,
      data: [{ id: 1, agentId: 'agent-1', profit: 100, status: 'PENDING', createdAt: '2026-01-01T00:00:00Z' }],
      message: 'success',
    });
  }),

  http.get(`${BASE}/settlements/stats`, () => {
    return HttpResponse.json({
      code: 0,
      data: { totalProfit: 5000, pendingAmount: 1000, settledAmount: 4000 },
      message: 'success',
    });
  }),

  http.get(`${BASE}/settlements/:id`, ({ params }) => {
    return HttpResponse.json({
      code: 0,
      data: { id: params.id, agentId: 'agent-1', profit: 100, status: 'PENDING' },
      message: 'success',
    });
  }),

  http.put(`${BASE}/settlements/:id`, async ({ params, request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json({
      code: 0,
      data: { id: params.id, ...body },
      message: 'success',
    });
  }),
];
