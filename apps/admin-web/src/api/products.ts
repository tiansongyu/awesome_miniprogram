import client from './client';

export interface Category {
  id: string;
  name: string;
  parentId?: string;
  sort?: number;
  children?: Category[];
}

export interface SkuPrice {
  type: 'AGENT_L1' | 'AGENT_L2' | 'AGENT_L3' | 'MEMBER_GOLD' | 'MEMBER_SILVER' | 'MEMBER_BRONZE' | 'RETAIL';
  price: number;
}

export interface Sku {
  id?: string;
  specs: string; // JSON string of key-value pairs
  stock: number;
  costPrice: number;
  prices: SkuPrice[];
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  categoryId?: string;
  category?: Category;
  imageUrl?: string;
  status: 'ON_SALE' | 'OFF_SALE';
  skus?: Sku[];
  createdAt: string;
}

export interface ProductListParams {
  page?: number;
  pageSize?: number;
  categoryId?: string;
  status?: string;
  keyword?: string;
}

export interface ProductListResult {
  list: Product[];
  total: number;
  page: number;
  pageSize: number;
}

export async function getCategories(): Promise<Category[]> {
  const res = await client.get('/categories');
  return res as unknown as Category[];
}

export async function createCategory(data: { name: string; parentId?: string; sort?: number }): Promise<Category> {
  const res = await client.post('/categories', data);
  return res as unknown as Category;
}

export async function updateCategory(id: string, data: { name?: string; sort?: number }): Promise<Category> {
  const res = await client.put(`/categories/${id}`, data);
  return res as unknown as Category;
}

export async function deleteCategory(id: string): Promise<void> {
  await client.delete(`/categories/${id}`);
}

export async function getProducts(params: ProductListParams): Promise<ProductListResult> {
  const res = await client.get('/products', { params });
  return res as unknown as ProductListResult;
}

export async function createProduct(data: Partial<Product> & { skus?: Sku[] }): Promise<Product> {
  const res = await client.post('/products', data);
  return res as unknown as Product;
}

export async function updateProduct(id: string, data: Partial<Product> & { skus?: Sku[] }): Promise<Product> {
  const res = await client.put(`/products/${id}`, data);
  return res as unknown as Product;
}

export async function updateProductStatus(id: string, status: 'ON_SALE' | 'OFF_SALE'): Promise<Product> {
  const res = await client.put(`/products/${id}/status`, { status });
  return res as unknown as Product;
}

export async function deleteProduct(id: string): Promise<void> {
  await client.delete(`/products/${id}`);
}
