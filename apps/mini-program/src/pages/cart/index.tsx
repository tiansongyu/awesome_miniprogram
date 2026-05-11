import { View, Text, Image } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useState } from 'react';
import { useCartStore } from '../../store/cart';
import { request, BASE_URL } from '../../utils/request';
import './index.scss';

interface Address {
  id: string;
  name: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  detail: string;
  isDefault: boolean;
}

interface CouponInfo {
  id: string;
  couponId: string;
  status: string;
  coupon: {
    id: string;
    name: string;
    type: 'FIXED' | 'PERCENT';
    value: number;
    minAmount: number;
    startTime: string;
    endTime: string;
  };
}

export default function Cart() {
  const { items, removeItem, updateQuantity, totalAmount, clear } = useCartStore();
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // 优惠券相关状态
  const [coupons, setCoupons] = useState<CouponInfo[]>([]);
  const [availableCoupons, setAvailableCoupons] = useState<CouponInfo[]>([]);
  const [selectedCoupon, setSelectedCoupon] = useState<CouponInfo | null>(null);
  const [showCouponList, setShowCouponList] = useState(false);

  const fetchAddresses = async () => {
    try {
      const data = await request<Address[]>({ url: '/addresses' });
      setAddresses(data);
      if (data.length > 0) {
        const defaultAddr = data.find((a) => a.isDefault) || data[0];
        setSelectedAddress(defaultAddr);
      }
    } catch (e) {
      Taro.showToast({ title: '获取地址失败', icon: 'none' });
    }
  };

  const fetchCoupons = async () => {
    try {
      const data = await request<CouponInfo[]>({ url: '/coupons/my?status=UNUSED' });
      setCoupons(data);
      // 根据订单金额筛选满足最低消费条件的优惠券
      const orderTotal = totalAmount();
      const available = data.filter((c) => {
        const minAmount = Number(c.coupon.minAmount);
        const now = new Date();
        const start = new Date(c.coupon.startTime);
        const end = new Date(c.coupon.endTime);
        return orderTotal >= minAmount && now >= start && now <= end;
      });
      setAvailableCoupons(available);
    } catch (e) {
      // 获取优惠券失败不阻塞结算
      setCoupons([]);
      setAvailableCoupons([]);
    }
  };

  // 计算优惠金额
  const calcDiscount = (coupon: CouponInfo | null): number => {
    if (!coupon) return 0;
    const orderTotal = totalAmount();
    if (coupon.coupon.type === 'FIXED') {
      return Math.min(Number(coupon.coupon.value), orderTotal);
    } else if (coupon.coupon.type === 'PERCENT') {
      // PERCENT: value 为折扣，如 8.5 表示 8.5 折
      const discount = orderTotal * (1 - Number(coupon.coupon.value) / 10);
      return Math.round(discount * 100) / 100;
    }
    return 0;
  };

  const discountAmount = calcDiscount(selectedCoupon);
  const payAmount = Math.max(0, totalAmount() - discountAmount);

  const handleCheckout = async () => {
    if (items.length === 0) {
      Taro.showToast({ title: '购物车为空', icon: 'none' });
      return;
    }
    await Promise.all([fetchAddresses(), fetchCoupons()]);
    setSelectedCoupon(null);
    setShowCouponList(false);
    setShowAddressModal(true);
  };

  const handleConfirmOrder = async () => {
    if (!selectedAddress) {
      Taro.showToast({ title: '请选择收货地址', icon: 'none' });
      return;
    }
    if (submitting) return;
    setSubmitting(true);
    try {
      const orderData: any = {
        items: items.map((item) => ({ skuId: item.skuId, quantity: item.quantity })),
        addressName: selectedAddress.name,
        addressPhone: selectedAddress.phone,
        addressDetail: `${selectedAddress.province}${selectedAddress.city}${selectedAddress.district}${selectedAddress.detail}`,
      };
      if (selectedCoupon) {
        orderData.couponId = selectedCoupon.id;
      }
      const order = await request<{ id: string }>({ url: '/orders', method: 'POST', data: orderData });
      await request({ url: `/payment/pay/${order.id}`, method: 'POST' });
      clear();
      setShowAddressModal(false);
      Taro.showToast({ title: '下单成功', icon: 'success' });
      setTimeout(() => {
        Taro.navigateTo({ url: '/pages/order-list/index' });
      }, 1500);
    } catch (e: any) {
      Taro.showToast({ title: e.message || '下单失败', icon: 'none' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectCoupon = (coupon: CouponInfo) => {
    if (selectedCoupon?.id === coupon.id) {
      setSelectedCoupon(null);
    } else {
      setSelectedCoupon(coupon);
    }
    setShowCouponList(false);
  };

  const formatCouponValue = (coupon: CouponInfo) => {
    if (coupon.coupon.type === 'FIXED') {
      return `¥${coupon.coupon.value}`;
    }
    return `${coupon.coupon.value}折`;
  };

  if (items.length === 0) {
    return (
      <View className="cart cart--empty">
        <View className="cart__empty-icon">🛒</View>
        <Text className="cart__empty-text">购物车空空如也</Text>
        <Text className="cart__empty-hint">去逛逛，挑选心仪的商品吧</Text>
      </View>
    );
  }

  return (
    <View className="cart">
      <View className="cart__list">
        {items.map((item) => (
          <View key={item.skuId} className="cart__item">
            <Image className="cart__item-image" src={item.image.startsWith('http') ? item.image : `${BASE_URL}${item.image}`} mode="aspectFill" />
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

      {/* Address selection modal */}
      {showAddressModal && (
        <View className="cart__modal-mask" onClick={() => setShowAddressModal(false)}>
          <View className="cart__modal" onClick={(e) => e.stopPropagation()}>
            <View className="cart__modal-header">
              <Text className="cart__modal-title">确认订单</Text>
              <Text className="cart__modal-close" onClick={() => setShowAddressModal(false)}>✕</Text>
            </View>

            <View className="cart__modal-section">
              <Text className="cart__modal-label">收货地址</Text>
              {addresses.length === 0 ? (
                <View className="cart__modal-no-addr">
                  <Text className="cart__modal-no-addr-text">暂无收货地址</Text>
                  <Text
                    className="cart__modal-add-addr"
                    onClick={() => {
                      setShowAddressModal(false);
                      Taro.navigateTo({ url: '/pages/address/index' });
                    }}
                  >
                    去添加
                  </Text>
                </View>
              ) : (
                <View className="cart__modal-addr-list">
                  {addresses.map((addr) => (
                    <View
                      key={addr.id}
                      className={`cart__modal-addr${selectedAddress?.id === addr.id ? ' cart__modal-addr--active' : ''}`}
                      onClick={() => setSelectedAddress(addr)}
                    >
                      <View className="cart__modal-addr-top">
                        <Text className="cart__modal-addr-name">{addr.name}</Text>
                        <Text className="cart__modal-addr-phone">{addr.phone}</Text>
                        {addr.isDefault && <Text className="cart__modal-addr-tag">默认</Text>}
                      </View>
                      <Text className="cart__modal-addr-detail">
                        {addr.province}{addr.city}{addr.district}{addr.detail}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <View className="cart__modal-section">
              <Text className="cart__modal-label">商品信息</Text>
              <Text className="cart__modal-summary">
                共 {items.reduce((s, i) => s + i.quantity, 0)} 件商品，合计 ¥{totalAmount().toFixed(2)}
              </Text>
            </View>

            {/* 优惠券选择区域 */}
            <View className="cart__modal-section">
              <View className="cart__coupon-header" onClick={() => setShowCouponList(!showCouponList)}>
                <Text className="cart__modal-label">优惠券</Text>
                <View className="cart__coupon-right">
                  {selectedCoupon ? (
                    <Text className="cart__coupon-selected">-¥{discountAmount.toFixed(2)}</Text>
                  ) : availableCoupons.length > 0 ? (
                    <Text className="cart__coupon-available">{availableCoupons.length}张可用</Text>
                  ) : (
                    <Text className="cart__coupon-none">暂无可用</Text>
                  )}
                  <Text className="cart__coupon-arrow">{showCouponList ? '▲' : '▼'}</Text>
                </View>
              </View>

              {showCouponList && (
                <View className="cart__coupon-list">
                  {availableCoupons.length === 0 ? (
                    <Text className="cart__coupon-empty">没有满足条件的优惠券</Text>
                  ) : (
                    availableCoupons.map((coupon) => (
                      <View
                        key={coupon.id}
                        className={`cart__coupon-item${selectedCoupon?.id === coupon.id ? ' cart__coupon-item--active' : ''}`}
                        onClick={() => handleSelectCoupon(coupon)}
                      >
                        <View className="cart__coupon-item-left">
                          <Text className="cart__coupon-item-value">{formatCouponValue(coupon)}</Text>
                          <Text className="cart__coupon-item-condition">满{coupon.coupon.minAmount}可用</Text>
                        </View>
                        <View className="cart__coupon-item-right">
                          <Text className="cart__coupon-item-name">{coupon.coupon.name}</Text>
                          <Text className="cart__coupon-item-check">
                            {selectedCoupon?.id === coupon.id ? '✓' : ''}
                          </Text>
                        </View>
                      </View>
                    ))
                  )}
                  {selectedCoupon && (
                    <View className="cart__coupon-cancel" onClick={() => { setSelectedCoupon(null); setShowCouponList(false); }}>
                      <Text className="cart__coupon-cancel-text">不使用优惠券</Text>
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* 金额汇总 */}
            <View className="cart__modal-section">
              <View className="cart__modal-amount-row">
                <Text className="cart__modal-amount-label">商品总价</Text>
                <Text className="cart__modal-amount-value">¥{totalAmount().toFixed(2)}</Text>
              </View>
              {selectedCoupon && (
                <View className="cart__modal-amount-row">
                  <Text className="cart__modal-amount-label">优惠券抵扣</Text>
                  <Text className="cart__modal-amount-discount">-¥{discountAmount.toFixed(2)}</Text>
                </View>
              )}
              <View className="cart__modal-amount-row cart__modal-amount-row--total">
                <Text className="cart__modal-amount-label">实付金额</Text>
                <Text className="cart__modal-amount-pay">¥{payAmount.toFixed(2)}</Text>
              </View>
            </View>

            <View className="cart__modal-footer">
              <View
                className={`cart__modal-confirm${!selectedAddress ? ' cart__modal-confirm--disabled' : ''}`}
                onClick={handleConfirmOrder}
              >
                <Text className="cart__modal-confirm-text">
                  {submitting ? '提交中...' : `确认下单 ¥${payAmount.toFixed(2)}`}
                </Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
