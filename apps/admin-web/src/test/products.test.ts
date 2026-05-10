import { describe, it, expect, beforeEach } from 'vitest';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getProducts,
  createProduct,
  updateProduct,
  updateProductStatus,
  deleteProduct,
} from '../api/products';

describe('Categories API', () => {
  beforeEach(() => {
    localStorage.setItem('accessToken', 'mock-token');
  });

  it('getCategories should return category list', async () => {
    const result = await getCategories();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty('id', 'cat-1');
    expect(result[0]).toHaveProperty('name', '护肤品');
    expect(result[0]).toHaveProperty('children');
  });

  it('createCategory should return new category', async () => {
    const result = await createCategory({ name: '彩妆', sort: 2 });
    expect(result).toHaveProperty('id', 'cat-new');
    expect(result).toHaveProperty('name', '彩妆');
  });

  it('updateCategory should return updated category', async () => {
    const result = await updateCategory('cat-1', { name: '新名称' });
    expect(result).toHaveProperty('id', 'cat-1');
    expect(result).toHaveProperty('name', '新名称');
  });

  it('deleteCategory should succeed', async () => {
    await expect(deleteCategory('cat-1')).resolves.not.toThrow();
  });
});

describe('Products API', () => {
  beforeEach(() => {
    localStorage.setItem('accessToken', 'mock-token');
  });

  it('getProducts should return paginated items', async () => {
    const result = await getProducts({ page: 1, pageSize: 10 });
    expect(result).toHaveProperty('items');
    expect(result).toHaveProperty('total', 1);
    expect(result).toHaveProperty('page', 1);
    expect(result).toHaveProperty('pageSize', 10);
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items[0]).toHaveProperty('id', 'prod-1');
    expect(result.items[0]).toHaveProperty('name', '测试商品');
  });

  it('getProducts should pass query params', async () => {
    const result = await getProducts({ page: 2, pageSize: 5, keyword: '面霜' });
    expect(result.page).toBe(2);
    expect(result.pageSize).toBe(5);
  });

  it('createProduct should return new product', async () => {
    const result = await createProduct({
      name: '新商品',
      categoryId: 'cat-1',
      images: ['https://img.test/b.jpg'],
      status: 'ON_SALE',
      skus: [],
    });
    expect(result).toHaveProperty('id', 'prod-new');
    expect(result).toHaveProperty('name', '新商品');
    expect(result).toHaveProperty('categoryId', 'cat-1');
  });

  it('updateProduct should return updated product', async () => {
    const result = await updateProduct('prod-1', { name: '更新商品' });
    expect(result).toHaveProperty('id', 'prod-1');
  });

  it('updateProductStatus should change status', async () => {
    const result = await updateProductStatus('prod-1', 'OFF_SALE');
    expect(result).toHaveProperty('id', 'prod-1');
    expect(result).toHaveProperty('status', 'OFF_SALE');
  });

  it('deleteProduct should succeed', async () => {
    await expect(deleteProduct('prod-1')).resolves.not.toThrow();
  });
});
