import { create } from 'zustand';

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

export const useCartStore = create<CartState>((set, get) => ({
  items: [],

  addItem: (item) => {
    const items = get().items;
    const existing = items.find((i) => i.skuId === item.skuId);
    if (existing) {
      set({ items: items.map((i) => i.skuId === item.skuId ? { ...i, quantity: i.quantity + item.quantity } : i) });
    } else {
      set({ items: [...items, item] });
    }
  },

  removeItem: (skuId) => {
    set({ items: get().items.filter((i) => i.skuId !== skuId) });
  },

  updateQuantity: (skuId, quantity) => {
    if (quantity <= 0) {
      set({ items: get().items.filter((i) => i.skuId !== skuId) });
    } else {
      set({ items: get().items.map((i) => i.skuId === skuId ? { ...i, quantity } : i) });
    }
  },

  clear: () => set({ items: [] }),

  totalAmount: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),

  totalCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
}));
