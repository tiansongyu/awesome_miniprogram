/**
 * Category & Agent edit API e2e test
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

  // --- Category Tests ---
  console.log('Test 1: Create category');
  const createCatRes = await request('POST', '/categories', {
    name: 'E2E测试分类',
    sort: 99,
  }, token);
  assert(createCatRes.code === 0, 'Create category returns code 0');
  const catId = createCatRes.data?.id;
  assert(!!catId, 'Category has id');
  assert(createCatRes.data?.name === 'E2E测试分类', 'Category name matches');

  console.log('\nTest 2: Create sub-category');
  const createSubRes = await request('POST', '/categories', {
    name: 'E2E子分类',
    parentId: catId,
    sort: 1,
  }, token);
  assert(createSubRes.code === 0, 'Create sub-category returns code 0');
  const subCatId = createSubRes.data?.id;
  assert(createSubRes.data?.parentId === catId, 'Sub-category parentId matches');

  console.log('\nTest 3: Update category');
  const updateCatRes = await request('PUT', `/categories/${catId}`, {
    name: 'E2E更新分类',
    sort: 50,
  }, token);
  assert(updateCatRes.code === 0, 'Update category returns code 0');
  assert(updateCatRes.data?.name === 'E2E更新分类', 'Category name updated');
  assert(updateCatRes.data?.sort === 50, 'Category sort updated');

  console.log('\nTest 4: Get category tree');
  const treeRes = await request('GET', '/categories');
  assert(treeRes.code === 0, 'Get tree returns code 0');
  const parentCat = treeRes.data?.find((c: any) => c.id === catId);
  assert(!!parentCat, 'Parent category found in tree');
  assert(parentCat?.children?.length >= 1, 'Parent has children');
  assert(parentCat?.children?.some((c: any) => c.id === subCatId), 'Sub-category found in children');

  console.log('\nTest 5: Delete sub-category then parent');
  const delSubRes = await request('DELETE', `/categories/${subCatId}`, undefined, token);
  assert(delSubRes.code === 0, 'Delete sub-category returns code 0');
  const delCatRes = await request('DELETE', `/categories/${catId}`, undefined, token);
  assert(delCatRes.code === 0, 'Delete parent category returns code 0');

  // --- Agent Tests ---
  console.log('\nTest 6: Get agents list');
  const agentsRes = await request('GET', '/agents?page=1&pageSize=10', undefined, token);
  assert(agentsRes.code === 0, 'Get agents returns code 0');
  const agents = agentsRes.data?.items || agentsRes.data || [];
  if (agents.length > 0) {
    const agent = agents[0];
    console.log(`\nTest 7: Update agent nickname (id: ${agent.id})`);
    const updateAgentRes = await request('PUT', `/agents/${agent.id}`, {
      nickname: 'E2E测试昵称',
    }, token);
    assert(updateAgentRes.code === 0, 'Update agent returns code 0');
    assert(updateAgentRes.data?.nickname === 'E2E测试昵称', 'Agent nickname updated');

    // Restore original nickname
    await request('PUT', `/agents/${agent.id}`, { nickname: agent.nickname }, token);
  } else {
    console.log('\nTest 7: Skipped (no agents in database)');
  }

  // --- Summary ---
  console.log(`\n${'='.repeat(40)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
