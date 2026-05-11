import { create } from 'zustand';
import Taro from '@tarojs/taro';

interface CartItem {
  skuId: string;
  productName: string;
  specs: Record<string, string>;
  price: number;
  quantity: number;
  image: string;
}

interface CartState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (skuId: string) => void;
  updateQuantity: (skuId: string, quantity: number) => void;
  clear: () => void;
  totalAmount: () => number;
  totalCount: () => number;
}

function loadCart(): CartItem[] {
  try {
    const data = Taro.getStorageSync('cart');
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveCart(items: CartItem[]) {
  Taro.setStorageSync('cart', JSON.stringify(items));
}

export const useCartStore = create<CartState>((set, get) => ({
  items: loadCart(),

  addItem: (item) => {
    const items = get().items;
    const existing = items.find((i) => i.skuId === item.skuId);
    let newItems: CartItem[];
    if (existing) {
      newItems = items.map((i) => i.skuId === item.skuId ? { ...i, quantity: i.quantity + item.quantity } : i);
    } else {
      newItems = [...items, item];
    }
    set({ items: newItems });
    saveCart(newItems);
  },

  removeItem: (skuId) => {
    const newItems = get().items.filter((i) => i.skuId !== skuId);
    set({ items: newItems });
    saveCart(newItems);
  },

  updateQuantity: (skuId, quantity) => {
    let newItems: CartItem[];
    if (quantity <= 0) {
      newItems = get().items.filter((i) => i.skuId !== skuId);
    } else {
      newItems = get().items.map((i) => i.skuId === skuId ? { ...i, quantity } : i);
    }
    set({ items: newItems });
    saveCart(newItems);
  },

  clear: () => {
    set({ items: [] });
    saveCart([]);
  },

  totalAmount: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),

  totalCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
}));
