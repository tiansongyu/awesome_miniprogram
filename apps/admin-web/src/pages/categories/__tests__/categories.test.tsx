import { render, screen, waitFor, act, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

vi.mock('../../../api/products', () => ({
  getCategories: vi.fn().mockResolvedValue([
    {
      id: 'cat-1',
      name: '电子产品',
      sort: 1,
      image: '/uploads/electronics.png',
      parentId: null,
      _count: { products: 12 },
      children: [
        {
          id: 'cat-1-1',
          name: '手机',
          sort: 1,
          parentId: 'cat-1',
          _count: { products: 8 },
          children: [],
        },
      ],
    },
    {
      id: 'cat-2',
      name: '服装',
      sort: 2,
      parentId: null,
      _count: { products: 0 },
      children: [],
    },
  ]),
  createCategory: vi.fn().mockResolvedValue({ id: 'cat-3', name: '新分类' }),
  updateCategory: vi.fn().mockResolvedValue({}),
  deleteCategory: vi.fn().mockResolvedValue({}),
}));

import Categories from '../index';

describe('Categories Page', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { cleanup(); document.body.innerHTML = ''; });

  it('渲染分类树形表格', async () => {
    await act(async () => { render(<Categories />); });
    await waitFor(() => {
      expect(screen.getByText('电子产品')).toBeInTheDocument();
      expect(screen.getByText('服装')).toBeInTheDocument();
    });
  });

  it('显示新增分类按钮', async () => {
    await act(async () => { render(<Categories />); });
    await waitFor(() => {
      expect(screen.getByText('新增分类')).toBeInTheDocument();
    });
  });

  it('显示商品数量', async () => {
    await act(async () => { render(<Categories />); });
    await waitFor(() => {
      expect(screen.getByText('12')).toBeInTheDocument();
    });
  });
});
