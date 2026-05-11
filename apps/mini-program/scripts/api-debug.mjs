#!/usr/bin/env node
/**
 * 小程序 API 全接口调试脚本
 * 用法: node scripts/api-debug.mjs
 */

const BASE_URL = 'http://127.0.0.1:3000';
const TEST_PHONE = '13900000001';
const TEST_PASSWORD = 'user123';

let token = '';
let userId = '';

async function api(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();
  return { status: res.status, ...data };
}

function log(label, result) {
  const status = result.status;
  const ok = status >= 200 && status < 300 && result.code === 0;
  const icon = ok ? '✅' : '❌';
  console.log(`${icon} [${status}] ${label}`);
  if (!ok) {
    console.log(`   └─ ${result.message || JSON.stringify(result).slice(0, 100)}`);
  }
  return ok;
}

async function run() {
  console.log('=== 小程序 API 全接口调试 ===\n');
  console.log(`目标: ${BASE_URL}`);
  console.log(`账户: ${TEST_PHONE} / ${TEST_PASSWORD}\n`);

  let passed = 0;
  let failed = 0;

  function check(label, result) {
    if (log(label, result)) passed++;
    else failed++;
    return result;
  }

  // ========== 认证模块 ==========
  console.log('\n--- 认证模块 ---');

  const loginRes = check('POST /auth/login', await api('POST', '/auth/login', { phone: TEST_PHONE, password: TEST_PASSWORD }));
  if (loginRes.data) {
    token = loginRes.data.accessToken;
    console.log(`   └─ token: ${token.slice(0, 20)}...`);
  }

  const wrongPwdRes = await api('POST', '/auth/login', { phone: TEST_PHONE, password: 'wrong123' });
  if (wrongPwdRes.status === 401) {
    console.log('✅ [401] POST /auth/login (错误密码) — 正确拒绝');
    passed++;
  } else {
    check('POST /auth/login (错误密码)', wrongPwdRes);
  }

  const refreshRes = check('POST /auth/refresh', await api('POST', '/auth/refresh', { refreshToken: loginRes.data?.refreshToken }));
  if (refreshRes.data) {
    token = refreshRes.data.accessToken;
  }

  // ========== 用户模块 ==========
  console.log('\n--- 用户模块 ---');

  const profileRes = check('GET /users/profile', await api('GET', '/users/profile'));
  if (profileRes.data) {
    userId = profileRes.data.id;
    console.log(`   └─ userId: ${userId}, nickname: ${profileRes.data.nickname}, role: ${profileRes.data.role}`);
  }

  check('PUT /users/profile (修改昵称)', await api('PUT', '/users/profile', { nickname: '测试用户' }));

  // ========== 商品模块 ==========
  console.log('\n--- 商品模块 ---');

  const categoriesRes = check('GET /categories', await api('GET', '/categories'));
  if (categoriesRes.data) {
    console.log(`   └─ ${categoriesRes.data.length} 个分类`);
  }

  const productsRes = check('GET /products?page=1&pageSize=10&status=ON_SALE', await api('GET', '/products?page=1&pageSize=10&status=ON_SALE'));
  let productId = '';
  let skuId = '';
  if (productsRes.data?.items?.length > 0) {
    productId = productsRes.data.items[0].id;
    console.log(`   └─ ${productsRes.data.total} 个商品, 第一个: ${productId}`);
  }

  if (productId) {
    const detailRes = check(`GET /products/${productId.slice(0, 8)}...`, await api('GET', `/products/${productId}`));
    if (detailRes.data?.skus?.length > 0) {
      skuId = detailRes.data.skus[0].id;
      console.log(`   └─ SKU: ${skuId}, 价格: ${detailRes.data.skus[0].price}`);
    }
  }

  // ========== 收藏模块 ==========
  console.log('\n--- 收藏模块 ---');

  if (productId) {
    check(`GET /favorites/${productId.slice(0, 8)}.../status`, await api('GET', `/favorites/${productId}/status`));
    check(`POST /favorites/${productId.slice(0, 8)}... (切换)`, await api('POST', `/favorites/${productId}`));
    check('GET /favorites', await api('GET', '/favorites'));
    check(`DELETE /favorites/${productId.slice(0, 8)}...`, await api('DELETE', `/favorites/${productId}`));
  }

  // ========== 签到模块 ==========
  console.log('\n--- 签到模块 ---');

  check('GET /sign-in/status', await api('GET', '/sign-in/status'));
  const signInRes = await api('POST', '/sign-in');
  if (signInRes.status === 400) {
    console.log(`⚠️  [400] POST /sign-in — 今日已签到 (正常)`);
    passed++;
  } else {
    check('POST /sign-in', signInRes);
  }
  check('GET /sign-in/points-log?page=1&pageSize=5', await api('GET', '/sign-in/points-log?page=1&pageSize=5'));

  // ========== 优惠券模块 ==========
  console.log('\n--- 优惠券模块 ---');

  check('GET /coupons/available', await api('GET', '/coupons/available'));
  check('GET /coupons/my', await api('GET', '/coupons/my'));

  // ========== 订单模块 ==========
  console.log('\n--- 订单模块 ---');

  check('GET /orders', await api('GET', '/orders'));

  // ========== 地址模块 ==========
  console.log('\n--- 地址模块 ---');

  const addrRes = check('GET /addresses', await api('GET', '/addresses'));
  if (addrRes.data) {
    console.log(`   └─ ${Array.isArray(addrRes.data) ? addrRes.data.length : addrRes.data.items?.length || 0} 个地址`);
  }

  // ========== 消息模块 ==========
  console.log('\n--- 消息模块 ---');

  check('GET /messages', await api('GET', '/messages'));
  check('GET /messages/unread-count', await api('GET', '/messages/unread-count'));

  // ========== 评价模块 ==========
  console.log('\n--- 评价模块 ---');

  if (productId) {
    check(`GET /reviews/product/${productId.slice(0, 8)}...`, await api('GET', `/reviews/product/${productId}?pageSize=5`));
  }

  // ========== 结算模块 ==========
  console.log('\n--- 结算模块 ---');

  check('GET /settlements/stats', await api('GET', '/settlements/stats'));
  check('GET /settlements/my', await api('GET', '/settlements/my'));

  // ========== 邀请码模块 ==========
  console.log('\n--- 邀请码模块 ---');

  check('GET /qrcode/my-code', await api('GET', '/qrcode/my-code'));

  // ========== 汇总 ==========
  console.log('\n=============================');
  console.log(`✅ 通过: ${passed}`);
  console.log(`❌ 失败: ${failed}`);
  console.log('=============================\n');

  if (failed > 0) process.exit(1);
}

run().catch((e) => {
  console.error('脚本执行失败:', e.message);
  process.exit(1);
});
