import { View, Text } from '@tarojs/components';
import Taro, { useDidShow, usePullDownRefresh } from '@tarojs/taro';
import { useState, useCallback } from 'react';
import { request } from '../../utils/request';
import './index.scss';

const STATUS_TABS = [
  { key: '', label: '全部' },
  { key: 'PENDING', label: '待支付' },
  { key: 'PAID', label: '已支付' },
  { key: 'SHIPPED', label: '已发货' },
  { key: 'COMPLETED', label: '已完成' },
];

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  PENDING:   { label: '待支付', color: '#ff9500' },
  PAID:      { label: '已支付', color: '#007aff' },
  SHIPPED:   { label: '已发货', color: '#00bcd4' },
  COMPLETED: { label: '已完成', color: '#4caf50' },
  CANCELLED: { label: '已取消', color: '#999999' },
};

interface OrderItem {
  skuName: string;
  specs: string;
  quantity: number;
  unitPrice: number;
  image?: string;
}

interface Order {
  id: string;
  orderNo: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  items: OrderItem[];
}

interface OrderListResponse {
  items: Order[];
  total: number;
  page: number;
  pageSize: number;
}

const PAGE_SIZE = 20;

export default function OrderList() {
  const [activeTab, setActiveTab] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = useCallback(async (status: string, pageNum: number, append = false) => {
    if (loading) return;
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page: pageNum, pageSize: PAGE_SIZE };
      if (status) params.status = status;
      const query = Object.entries(params)
        .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
        .join('&');
      const res = await request<OrderListResponse>({ url: `/orders?${query}` });
      setTotal(res.total);
      setOrders(prev => append ? [...prev, ...res.items] : res.items);
      setPage(pageNum);
    } catch (_) {
      // error already shown by request util
    } finally {
      setLoading(false);
    }
  }, [loading]);

  // Load on tab show and when tab changes
  useDidShow(() => {
    fetchOrders(activeTab, 1, false);
  });

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    setOrders([]);
    fetchOrders(key, 1, false);
  };

  // Pull-down refresh
  usePullDownRefresh(async () => {
    setRefreshing(true);
    await fetchOrders(activeTab, 1, false);
    setRefreshing(false);
    Taro.stopPullDownRefresh();
  });

  // Load more on scroll to bottom
  Taro.useReachBottom(() => {
    const hasMore = orders.length < total;
    if (hasMore && !loading) {
      fetchOrders(activeTab, page + 1, true);
    }
  });

  const goDetail = (id: string) => {
    Taro.navigateTo({ url: `/pages/order-detail/index?id=${id}` });
  };

  const statusInfo = (status: string) => STATUS_MAP[status] || { label: status, color: '#999' };

  return (
    <View className="order-list">
      {/* Tab bar */}
      <View className="order-list__tabs">
        {STATUS_TABS.map(tab => (
          <View
            key={tab.key}
            className={`order-list__tab${activeTab === tab.key ? ' order-list__tab--active' : ''}`}
            onClick={() => handleTabChange(tab.key)}
          >
            <Text>{tab.label}</Text>
          </View>
        ))}
      </View>

      {/* Order cards */}
      <View className="order-list__body">
        {orders.length === 0 && !loading && (
          <View className="order-list__empty">
            <Text className="order-list__empty-text">暂无订单</Text>
          </View>
        )}

        {orders.map(order => {
          const si = statusInfo(order.status);
          return (
            <View key={order.id} className="order-card" onClick={() => goDetail(order.id)}>
              {/* Header */}
              <View className="order-card__header">
                <Text className="order-card__no">订单号：{order.orderNo}</Text>
                <Text className="order-card__status" style={{ color: si.color }}>{si.label}</Text>
              </View>

              {/* Items */}
              {order.items.map((item, idx) => (
                <View key={idx} className="order-card__item">
                  <View className="order-card__item-info">
                    <Text className="order-card__item-name">{item.skuName}</Text>
                    {item.specs ? <Text className="order-card__item-specs">{item.specs}</Text> : null}
                  </View>
                  <View className="order-card__item-right">
                    <Text className="order-card__item-price">¥{item.unitPrice.toFixed(2)}</Text>
                    <Text className="order-card__item-qty">×{item.quantity}</Text>
                  </View>
                </View>
              ))}

              {/* Footer */}
              <View className="order-card__footer">
                <Text className="order-card__total">
                  合计：<Text className="order-card__total-amount">¥{order.totalAmount.toFixed(2)}</Text>
                </Text>
              </View>
            </View>
          );
        })}

        {loading && (
          <View className="order-list__loading">
            <Text className="order-list__loading-text">加载中...</Text>
          </View>
        )}

        {!loading && orders.length > 0 && orders.length >= total && (
          <View className="order-list__end">
            <Text className="order-list__end-text">没有更多了</Text>
          </View>
        )}
      </View>
    </View>
  );
}
