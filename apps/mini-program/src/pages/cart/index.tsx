import { View, Text, Image } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useCartStore } from '../../store/cart';
import { request } from '../../utils/request';
import './index.scss';

export default function Cart() {
  const { items, removeItem, updateQuantity, totalAmount, clear } = useCartStore();

  const handleCheckout = async () => {
    if (items.length === 0) {
      Taro.showToast({ title: '购物车为空', icon: 'none' });
      return;
    }
    try {
      const orderData = {
        items: items.map((item) => ({ skuId: item.skuId, quantity: item.quantity })),
      };
      const order = await request<{ id: string }>({ url: '/orders', method: 'POST', data: orderData });
      await request({ url: `/payment/pay/${order.id}`, method: 'POST' });
      clear();
      Taro.showToast({ title: '下单成功', icon: 'success' });
      setTimeout(() => {
        Taro.navigateTo({ url: '/pages/order-list/index' });
      }, 1500);
    } catch (e: any) {
      Taro.showToast({ title: e.message || '下单失败', icon: 'none' });
    }
  };

  if (items.length === 0) {
    return (
      <View className="cart cart--empty">
        <View className="cart__empty-icon">🛒</View>
        <Text className="cart__empty-text">购物车空空如也</Text>
      </View>
    );
  }

  return (
    <View className="cart">
      <View className="cart__list">
        {items.map((item) => (
          <View key={item.skuId} className="cart__item">
            <Image className="cart__item-image" src={item.image} mode="aspectFill" />
            <View className="cart__item-info">
              <Text className="cart__item-name">{item.productName}</Text>
              <Text className="cart__item-specs">
                {Object.entries(item.specs)
                  .map(([k, v]) => `${k}: ${v}`)
                  .join('  ')}
              </Text>
              <View className="cart__item-bottom">
                <Text className="cart__item-price">¥{item.price.toFixed(2)}</Text>
                <View className="cart__item-qty">
                  <View
                    className="cart__qty-btn"
                    onClick={() => updateQuantity(item.skuId, item.quantity - 1)}
                  >
                    <Text className="cart__qty-btn-text">-</Text>
                  </View>
                  <Text className="cart__qty-num">{item.quantity}</Text>
                  <View
                    className="cart__qty-btn"
                    onClick={() => updateQuantity(item.skuId, item.quantity + 1)}
                  >
                    <Text className="cart__qty-btn-text">+</Text>
                  </View>
                </View>
              </View>
            </View>
            <View className="cart__item-delete" onClick={() => removeItem(item.skuId)}>
              <Text className="cart__item-delete-text">删除</Text>
            </View>
          </View>
        ))}
      </View>

      <View className="cart__bar">
        <View className="cart__bar-total">
          <Text className="cart__bar-label">合计：</Text>
          <Text className="cart__bar-amount">¥{totalAmount().toFixed(2)}</Text>
        </View>
        <View className="cart__bar-btn" onClick={handleCheckout}>
          <Text className="cart__bar-btn-text">去结算</Text>
        </View>
      </View>
    </View>
  );
}
