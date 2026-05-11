import { View, Text, Image } from '@tarojs/components';
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
  { key: 'CANCELLED', label: '已取消' },
];

const STATUS_MAP: Record<string, { label: string; color: string; bgColor: string }> = {
  PENDING:   { label: '待支付', color: '#ff9500', bgColor: '#fff8ec' },
  PAID:      { label: '已支付', color: '#007aff', bgColor: '#ecf5ff' },
  SHIPPED:   { label: '已发货', color: '#00bcd4', bgColor: '#ecfcff' },
  COMPLETED: { label: '已完成', color: '#4caf50', bgColor: '#edfbee' },
  CANCELLED: { label: '已取消', color: '#999999', bgColor: '#f5f5f5' },
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

  const statusInfo = (status: string) => STATUS_MAP[status] || { label: status, color: '#999', bgColor: '#f5f5f5' };

  const handleCancelOrder = (e: any, orderId: string) => {
    e.stopPropagation();
    Taro.showModal({
      title: '提示',
      content: '确定要取消该订单吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await request({ url: `/orders/${orderId}/cancel`, method: 'POST' });
            Taro.showToast({ title: '已取消', icon: 'success' });
            fetchOrders(activeTab, 1, false);
          } catch (_) {
            Taro.showToast({ title: '取消失败', icon: 'none' });
          }
        }
      },
    });
  };

  const handlePay = (e: any, orderId: string) => {
    e.stopPropagation();
    Taro.navigateTo({ url: `/pages/order-detail/index?id=${orderId}&action=pay` });
  };

  const handleConfirmReceive = (e: any, orderId: string) => {
    e.stopPropagation();
    Taro.showModal({
      title: '提示',
      content: '确认已收到商品？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await request({ url: `/orders/${orderId}/confirm`, method: 'POST' });
            Taro.showToast({ title: '已确认收货', icon: 'success' });
            fetchOrders(activeTab, 1, false);
          } catch (_) {
            Taro.showToast({ title: '操作失败', icon: 'none' });
          }
        }
      },
    });
  };

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
            <View className="order-list__empty-icon">📦</View>
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
                <View className="order-card__status-tag" style={{ backgroundColor: si.bgColor }}>
                  <Text className="order-card__status-text" style={{ color: si.color }}>{si.label}</Text>
                </View>
              </View>

              {/* Items */}
              {order.items.map((item, idx) => (
                <View key={idx} className="order-card__item">
                  {item.image && (
                    <Image className="order-card__item-img" src={item.image} mode="aspectFill" />
                  )}
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
                  共{order.items.reduce((s, i) => s + i.quantity, 0)}件 合计：
                  <Text className="order-card__total-amount">¥{order.totalAmount.toFixed(2)}</Text>
                </Text>
              </View>

              {/* Action buttons */}
              {(order.status === 'PENDING' || order.status === 'SHIPPED') && (
                <View className="order-card__actions">
                  {order.status === 'PENDING' && (
                    <>
                      <View className="order-card__btn order-card__btn--default" onClick={(e) => handleCancelOrder(e, order.id)}>
                        <Text className="order-card__btn-text order-card__btn-text--default">取消订单</Text>
                      </View>
                      <View className="order-card__btn order-card__btn--primary" onClick={(e) => handlePay(e, order.id)}>
                        <Text className="order-card__btn-text order-card__btn-text--primary">去支付</Text>
                      </View>
                    </>
                  )}
                  {order.status === 'SHIPPED' && (
                    <View className="order-card__btn order-card__btn--primary" onClick={(e) => handleConfirmReceive(e, order.id)}>
                      <Text className="order-card__btn-text order-card__btn-text--primary">确认收货</Text>
                    </View>
                  )}
                </View>
              )}
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
