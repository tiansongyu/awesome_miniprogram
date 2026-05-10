/**
 * Product CRUD API e2e test
 * Tests create, read, update (with SKUs), and delete operations
 */

const BASE_URL = 'http://localhost:3000';

async function request(method: string, path: string, body?: any, token?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

async function login(): Promise<string> {
  const res = await request('POST', '/auth/admin/login', {
    phone: '13800000000',
    password: 'admin123',
  });
  if (res.code !== 0) throw new Error(`Login failed: ${JSON.stringify(res)}`);
  return res.data.accessToken;
}

async function main() {
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`  ✓ ${msg}`);
      passed++;
    } else {
      console.log(`  ✗ ${msg}`);
      failed++;
    }
  }

  const token = await login();
  console.log('Logged in successfully\n');

  // --- Test 1: Create product ---
  console.log('Test 1: Create product');
  const createRes = await request('POST', '/products', {
    name: 'E2E测试商品',
    description: '测试描述',
    images: ['https://example.com/test.jpg'],
    categoryId: 'seed-category-skincare',
    status: 'ON_SALE',
    skus: [{
      specs: { '规格': '标准' },
      stock: 50,
      costPrice: 10,
      prices: [
        { priceType: 'AGENT_L1', price: 20 },
        { priceType: 'AGENT_L2', price: 25 },
        { priceType: 'AGENT_L3', price: 30 },
        { priceType: 'MEMBER_GOLD', price: 35 },
        { priceType: 'MEMBER_SILVER', price: 38 },
        { priceType: 'MEMBER_BRONZE', price: 40 },
        { priceType: 'RETAIL', price: 50 },
      ],
    }],
  }, token);

  assert(createRes.code === 0, 'Create returns code 0');
  const productId = createRes.data?.id;
  assert(!!productId, 'Product has id');
  assert(createRes.data?.name === 'E2E测试商品', 'Product name matches');
  assert(createRes.data?.skus?.length === 1, 'Has 1 SKU');
  assert(createRes.data?.skus?.[0]?.prices?.length === 7, 'SKU has 7 prices');

  // --- Test 2: Read product ---
  console.log('\nTest 2: Read product');
  const readRes = await request('GET', `/products/${productId}`, undefined, token);
  assert(readRes.code === 0, 'Read returns code 0');
  assert(readRes.data?.name === 'E2E测试商品', 'Name matches');
  assert(readRes.data?.skus?.[0]?.stock === 50, 'Stock is 50');

  // --- Test 3: Update product with new SKUs ---
  console.log('\nTest 3: Update product (name + SKUs)');
  const updateRes = await request('PUT', `/products/${productId}`, {
    name: 'E2E更新后商品',
    description: '更新后描述',
    images: ['https://example.com/updated.jpg'],
    categoryId: 'seed-category-skincare',
    status: 'ON_SALE',
    skus: [
      {
        specs: { '规格': '大号' },
        stock: 200,
        costPrice: 15,
        prices: [
          { priceType: 'AGENT_L1', price: 30 },
          { priceType: 'AGENT_L2', price: 35 },
          { priceType: 'AGENT_L3', price: 40 },
          { priceType: 'MEMBER_GOLD', price: 45 },
          { priceType: 'MEMBER_SILVER', price: 48 },
          { priceType: 'MEMBER_BRONZE', price: 50 },
          { priceType: 'RETAIL', price: 60 },
        ],
      },
      {
        specs: { '规格': '小号' },
        stock: 100,
        costPrice: 8,
        prices: [
          { priceType: 'AGENT_L1', price: 15 },
          { priceType: 'AGENT_L2', price: 18 },
          { priceType: 'AGENT_L3', price: 20 },
          { priceType: 'MEMBER_GOLD', price: 22 },
          { priceType: 'MEMBER_SILVER', price: 24 },
          { priceType: 'MEMBER_BRONZE', price: 25 },
          { priceType: 'RETAIL', price: 30 },
        ],
      },
    ],
  }, token);

  assert(updateRes.code === 0, 'Update returns code 0');
  assert(updateRes.data?.name === 'E2E更新后商品', 'Name updated');
  assert(updateRes.data?.description === '更新后描述', 'Description updated');
  assert(updateRes.data?.images?.[0] === 'https://example.com/updated.jpg', 'Image updated');
  assert(updateRes.data?.skus?.length === 2, 'Now has 2 SKUs');

  const sku1 = updateRes.data?.skus?.find((s: any) => s.specs?.['规格'] === '大号');
  const sku2 = updateRes.data?.skus?.find((s: any) => s.specs?.['规格'] === '小号');
  assert(sku1?.stock === 200, 'SKU1 stock is 200');
  assert(sku2?.stock === 100, 'SKU2 stock is 100');
  assert(sku1?.prices?.find((p: any) => p.priceType === 'RETAIL')?.price == 60, 'SKU1 retail price is 60');
  assert(sku2?.prices?.find((p: any) => p.priceType === 'RETAIL')?.price == 30, 'SKU2 retail price is 30');

  // --- Test 4: Update only basic fields (no SKUs) ---
  console.log('\nTest 4: Update only basic fields');
  const updateBasicRes = await request('PUT', `/products/${productId}`, {
    name: 'E2E仅更新名称',
  }, token);
  assert(updateBasicRes.code === 0, 'Basic update returns code 0');
  assert(updateBasicRes.data?.name === 'E2E仅更新名称', 'Name updated');
  assert(updateBasicRes.data?.skus?.length === 2, 'SKUs unchanged (still 2)');

  // --- Test 5: Update status ---
  console.log('\nTest 5: Update status');
  const statusRes = await request('PUT', `/products/${productId}/status`, { status: 'OFF_SALE' }, token);
  assert(statusRes.code === 0, 'Status update returns code 0');
  const verifyRes = await request('GET', `/products/${productId}`, undefined, token);
  assert(verifyRes.data?.status === 'OFF_SALE', 'Status is OFF_SALE');

  // --- Test 6: Delete product ---
  console.log('\nTest 6: Delete product');
  const deleteRes = await request('DELETE', `/products/${productId}`, undefined, token);
  assert(deleteRes.code === 0, 'Delete returns code 0');
  const deletedRes = await request('GET', `/products/${productId}`, undefined, token);
  assert(deletedRes.code !== 0 || deletedRes.data === null, 'Product no longer exists');

  // --- Summary ---
  console.log(`\n${'='.repeat(40)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error('Test error:', e);
  process.exit(1);
});
