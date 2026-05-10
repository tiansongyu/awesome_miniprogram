import { View, Text } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { useState } from 'react';
import { request } from '../../utils/request';
import './index.scss';

const STATUS_MAP: Record<string, { label: string; bgColor: string; textColor: string }> = {
  PENDING:   { label: '待支付',  bgColor: '#fff8ec', textColor: '#ff9500' },
  PAID:      { label: '已支付',  bgColor: '#ecf5ff', textColor: '#007aff' },
  SHIPPED:   { label: '已发货',  bgColor: '#ecfcff', textColor: '#00bcd4' },
  COMPLETED: { label: '已完成',  bgColor: '#edfbee', textColor: '#4caf50' },
  CANCELLED: { label: '已取消',  bgColor: '#f5f5f5', textColor: '#999999' },
};

interface OrderItem {
  skuName: string;
  specs: string;
  quantity: number;
  unitPrice: number;
}

interface Settlement {
  id: string;
  profit: number;
  settledAt?: string;
  status?: string;
}

interface OrderDetail {
  id: string;
  orderNo: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  items: OrderItem[];
  settlements: Settlement[];
}

export default function OrderDetail() {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(false);

  const { id } = Taro.getCurrentInstance().router?.params || {};

  useDidShow(() => {
    if (!id) return;
    setLoading(true);
    request<OrderDetail>({ url: `/orders/${id}` })
      .then(res => setOrder(res))
      .catch(() => {})
      .finally(() => setLoading(false));
  });

  if (loading) {
    return (
      <View className="order-detail order-detail--loading">
        <Text className="order-detail__loading-text">加载中...</Text>
      </View>
    );
  }

  if (!order) {
    return (
      <View className="order-detail order-detail--empty">
        <Text className="order-detail__empty-text">订单不存在</Text>
      </View>
    );
  }

  const si = STATUS_MAP[order.status] || { label: order.status, bgColor: '#f5f5f5', textColor: '#999' };
  const totalProfit = order.settlements.reduce((sum, s) => sum + (s.profit || 0), 0);

  const formatDate = (iso: string) => {
    try {
      return iso.replace('T', ' ').slice(0, 19);
    } catch (_) {
      return iso;
    }
  };

  return (
    <View className="order-detail">
      {/* Status banner */}
      <View className="order-detail__banner" style={{ backgroundColor: si.bgColor }}>
        <Text className="order-detail__banner-status" style={{ color: si.textColor }}>{si.label}</Text>
      </View>

      {/* Order info */}
      <View className="order-detail__section">
        <Text className="order-detail__section-title">订单信息</Text>
        <View className="order-detail__row">
          <Text className="order-detail__label">订单编号</Text>
          <Text className="order-detail__value">{order.orderNo}</Text>
        </View>
        <View className="order-detail__row">
          <Text className="order-detail__label">下单时间</Text>
          <Text className="order-detail__value">{formatDate(order.createdAt)}</Text>
        </View>
      </View>

      {/* Items */}
      <View className="order-detail__section">
        <Text className="order-detail__section-title">商品明细</Text>
        {order.items.map((item, idx) => (
          <View key={idx} className="order-detail__item">
            <View className="order-detail__item-info">
              <Text className="order-detail__item-name">{item.skuName}</Text>
              {item.specs ? <Text className="order-detail__item-specs">{item.specs}</Text> : null}
            </View>
            <View className="order-detail__item-right">
              <Text className="order-detail__item-price">¥{item.unitPrice.toFixed(2)}</Text>
              <Text className="order-detail__item-qty">×{item.quantity}</Text>
            </View>
          </View>
        ))}
        <View className="order-detail__total-row">
          <Text className="order-detail__total-label">合计</Text>
          <Text className="order-detail__total-amount">¥{order.totalAmount.toFixed(2)}</Text>
        </View>
      </View>

      {/* Settlement info */}
      {order.settlements.length > 0 && (
        <View className="order-detail__section">
          <Text className="order-detail__section-title">结算信息</Text>
          {order.settlements.map((s, idx) => (
            <View key={idx} className="order-detail__settlement">
              <View className="order-detail__row">
                <Text className="order-detail__label">结算利润</Text>
                <Text className="order-detail__value order-detail__value--profit">¥{(s.profit || 0).toFixed(2)}</Text>
              </View>
              {s.settledAt && (
                <View className="order-detail__row">
                  <Text className="order-detail__label">结算时间</Text>
                  <Text className="order-detail__value">{formatDate(s.settledAt)}</Text>
                </View>
              )}
              {s.status && (
                <View className="order-detail__row">
                  <Text className="order-detail__label">结算状态</Text>
                  <Text className="order-detail__value">{s.status}</Text>
                </View>
              )}
            </View>
          ))}
          {order.settlements.length > 1 && (
            <View className="order-detail__row order-detail__row--total">
              <Text className="order-detail__label">总利润</Text>
              <Text className="order-detail__value order-detail__value--profit">¥{totalProfit.toFixed(2)}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}
