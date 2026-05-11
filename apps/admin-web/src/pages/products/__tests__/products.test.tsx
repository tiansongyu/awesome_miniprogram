import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import Products from '../index';

const mockGetProducts = vi.fn().mockResolvedValue({
  items: [
    {
      id: 'prod-1',
      name: '测试商品A',
      description: '描述A',
      categoryId: 'cat-1',
      category: { id: 'cat-1', name: '护肤品' },
      images: ['https://img.test/a.jpg'],
      status: 'ON_SALE',
      createdAt: '2026-01-01T00:00:00Z',
      skus: [
        {
          id: 'sku-1',
          specs: '{"颜色":"红"}',
          stock: 10,
          costPrice: 50,
          prices: [{ type: 'RETAIL', price: 100 }],
        },
      ],
    },
  ],
  total: 1,
  page: 1,
  pageSize: 20,
});

const mockCreateProduct = vi.fn().mockResolvedValue({ id: 'prod-new' });
const mockDeleteProduct = vi.fn().mockResolvedValue({ id: 'prod-1' });

vi.mock('../../../api/products', () => ({
  getCategories: vi.fn().mockResolvedValue([
    { id: 'cat-1', name: '护肤品', parentId: null, sort: 1, children: [] },
    { id: 'cat-2', name: '彩妆', parentId: null, sort: 2, children: [] },
  ]),
  getProducts: (...args: unknown[]) => mockGetProducts(...args),
  createProduct: (...args: unknown[]) => mockCreateProduct(...args),
  updateProduct: vi.fn().mockResolvedValue({ id: 'prod-1' }),
  updateProductStatus: vi.fn().mockResolvedValue({ id: 'prod-1', status: 'OFF_SALE' }),
  deleteProduct: (...args: unknown[]) => mockDeleteProduct(...args),
}));

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

function getSubmitButton(): HTMLElement | null {
  // The "确定" button is in .ant-drawer-footer; antd inserts a space: "确 定"
  const footer = document.querySelector('.ant-drawer-footer');
  if (!footer) return null;
  const buttons = footer.querySelectorAll('button');
  for (const btn of buttons) {
    if (btn.textContent?.includes('确') && btn.textContent?.includes('定')) return btn;
  }
  return null;
}

async function renderAndWait() {
  await act(async () => {
    render(<Products />);
  });
  await waitFor(() => {
    expect(mockGetProducts).toHaveBeenCalled();
  });
}

describe('Products Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the product list page with product data', async () => {
    await renderAndWait();
    expect(screen.getByText('测试商品A')).toBeInTheDocument();
  });

  it('renders the "新增商品" button', async () => {
    await renderAndWait();
    expect(screen.getByRole('button', { name: /新增商品/ })).toBeInTheDocument();
  });

  it('opens drawer when clicking "新增商品"', async () => {
    await renderAndWait();
    fireEvent.click(screen.getByRole('button', { name: /新增商品/ }));
    await waitFor(() => {
      // Drawer should become visible (has open class)
      const drawer = document.querySelector('.ant-drawer-open');
      expect(drawer).not.toBeNull();
    });
  });

  it('validates that name is required', async () => {
    await renderAndWait();
    fireEvent.click(screen.getByRole('button', { name: /新增商品/ }));

    await waitFor(() => {
      expect(document.querySelector('.ant-drawer-open')).not.toBeNull();
    });

    const submitBtn = getSubmitButton();
    expect(submitBtn).toBeTruthy();
    fireEvent.click(submitBtn!);

    await waitFor(() => {
      expect(screen.getByText('请输入商品名称')).toBeInTheDocument();
    });
  });

  it('validates that category is required', async () => {
    await renderAndWait();
    fireEvent.click(screen.getByRole('button', { name: /新增商品/ }));

    await waitFor(() => {
      expect(document.querySelector('.ant-drawer-open')).not.toBeNull();
    });

    const submitBtn = getSubmitButton();
    expect(submitBtn).toBeTruthy();
    fireEvent.click(submitBtn!);

    await waitFor(() => {
      expect(screen.getByText('请选择分类')).toBeInTheDocument();
    });
  });

  it('submits form and calls createProduct API', async () => {
    await renderAndWait();
    fireEvent.click(screen.getByRole('button', { name: /新增商品/ }));

    await waitFor(() => {
      expect(document.querySelector('.ant-drawer-open')).not.toBeNull();
    });

    // Fill in name
    const nameInput = screen.getByPlaceholderText('请输入商品名称') as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: '新商品' } });

    // Select category - find the select with placeholder "请选择分类"
    const categorySelect = document.querySelector('.ant-drawer-body [id="categoryId"]')?.closest('.ant-select')?.querySelector('.ant-select-selector') as HTMLElement
      || Array.from(document.querySelectorAll('.ant-select-selection-placeholder')).find(el => el.textContent === '请选择分类')?.closest('.ant-select-selector') as HTMLElement;
    expect(categorySelect).toBeTruthy();
    fireEvent.mouseDown(categorySelect);
    await waitFor(() => {
      const options = document.querySelectorAll('.ant-select-item-option');
      expect(options.length).toBeGreaterThan(0);
    });
    // Click the first category option
    const option = document.querySelector('.ant-select-item-option') as HTMLElement;
    fireEvent.click(option);

    // Submit
    const submitBtn = getSubmitButton();
    fireEvent.click(submitBtn!);

    await waitFor(() => {
      expect(mockCreateProduct).toHaveBeenCalled();
    });
  });

  it('shows delete confirmation popconfirm', async () => {
    await renderAndWait();

    // The delete button is a link-type button with text "删除" inside the table
    const tableBody = document.querySelector('.ant-table-tbody');
    expect(tableBody).not.toBeNull();

    const deleteBtn = Array.from(tableBody!.querySelectorAll('button')).find(
      (btn) => btn.textContent?.trim() === '删除',
    );
    expect(deleteBtn).toBeTruthy();

    fireEvent.click(deleteBtn!);

    await waitFor(() => {
      // Popconfirm shows "确定要删除该商品吗？"
      expect(screen.getByText('确定要删除该商品吗？')).toBeInTheDocument();
    });
  });
});
