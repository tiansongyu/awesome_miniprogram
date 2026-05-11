import { useCartStore } from './cart';

const makeItem = (overrides: Partial<Parameters<typeof useCartStore.getState>['0']> = {}) => ({
  skuId: 'sku-1',
  productName: 'Test Product',
  specs: { color: 'red' },
  price: 100,
  quantity: 1,
  image: 'https://example.com/img.png',
  ...overrides,
});

describe('cart store', () => {
  beforeEach(() => {
    useCartStore.setState({ items: [] });
  });

  describe('addItem', () => {
    it('should add a new item to the cart', () => {
      useCartStore.getState().addItem(makeItem());

      expect(useCartStore.getState().items).toHaveLength(1);
      expect(useCartStore.getState().items[0].skuId).toBe('sku-1');
    });

    it('should increase quantity when adding an existing item', () => {
      useCartStore.getState().addItem(makeItem({ quantity: 2 }));
      useCartStore.getState().addItem(makeItem({ quantity: 3 }));

      expect(useCartStore.getState().items).toHaveLength(1);
      expect(useCartStore.getState().items[0].quantity).toBe(5);
    });
  });

  describe('removeItem', () => {
    it('should remove an item by skuId', () => {
      useCartStore.getState().addItem(makeItem({ skuId: 'sku-1' }));
      useCartStore.getState().addItem(makeItem({ skuId: 'sku-2', productName: 'Product 2' }));

      useCartStore.getState().removeItem('sku-1');

      expect(useCartStore.getState().items).toHaveLength(1);
      expect(useCartStore.getState().items[0].skuId).toBe('sku-2');
    });
  });

  describe('updateQuantity', () => {
    it('should update the quantity of an item', () => {
      useCartStore.getState().addItem(makeItem({ skuId: 'sku-1', quantity: 1 }));

      useCartStore.getState().updateQuantity('sku-1', 5);

      expect(useCartStore.getState().items[0].quantity).toBe(5);
    });

    it('should remove the item when quantity is 0', () => {
      useCartStore.getState().addItem(makeItem({ skuId: 'sku-1' }));

      useCartStore.getState().updateQuantity('sku-1', 0);

      expect(useCartStore.getState().items).toHaveLength(0);
    });
  });

  describe('clear', () => {
    it('should clear all items', () => {
      useCartStore.getState().addItem(makeItem({ skuId: 'sku-1' }));
      useCartStore.getState().addItem(makeItem({ skuId: 'sku-2' }));

      useCartStore.getState().clear();

      expect(useCartStore.getState().items).toHaveLength(0);
    });
  });

  describe('totalAmount', () => {
    it('should calculate the total amount', () => {
      useCartStore.getState().addItem(makeItem({ skuId: 'sku-1', price: 100, quantity: 2 }));
      useCartStore.getState().addItem(makeItem({ skuId: 'sku-2', price: 50, quantity: 3 }));

      const total = useCartStore.getState().totalAmount();

      expect(total).toBe(350); // 100*2 + 50*3
    });
  });

  describe('totalCount', () => {
    it('should calculate the total count of items', () => {
      useCartStore.getState().addItem(makeItem({ skuId: 'sku-1', quantity: 2 }));
      useCartStore.getState().addItem(makeItem({ skuId: 'sku-2', quantity: 3 }));

      const count = useCartStore.getState().totalCount();

      expect(count).toBe(5);
    });
  });
});
