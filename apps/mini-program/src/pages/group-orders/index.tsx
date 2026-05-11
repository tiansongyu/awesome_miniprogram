import { View, Text, Image, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useState, useEffect } from 'react';
import { request, BASE_URL } from '../../utils/request';
import './index.scss';

interface GroupOrder {
  id: string;
  joinedAt: string;
  group: {
    id: string;
    status: string;
    expireAt: string;
    activity: {
      groupPrice: number;
      groupSize: number;
      product: { id: string; name: string; images: string[] };
    };
    members: { id: string; user: { id: string; nickname: string; avatar: string } }[];
  };
  order: { id: string; orderNo: string; status: string; payAmount: number };
}

const statusMap: Record<string, string> = {
  PENDING: '拼团中',
  SUCCESS: '已成团',
  FAILED: '拼团失败',
  CANCELLED: '已取消',
};

const statusColorMap: Record<string, string> = {
  PENDING: '#ff6b35',
  SUCCESS: '#52c41a',
  FAILED: '#999',
  CANCELLED: '#999',
};

export default function GroupOrdersPage() {
  const [orders, setOrders] = useState<GroupOrder[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadOrders(1, true);
  }, []);

  async function loadOrders(pageNum: number, replace = false) {
    if (loading) return;
    setLoading(true);
    try {
      const data = await request<{ items: GroupOrder[]; total: number }>({
        url: `/group-buy/my-groups?page=${pageNum}&pageSize=20`,
      });
      setTotal(data.total);
      setOrders((prev) => (replace ? data.items : [...prev, ...data.items]));
      setPage(pageNum);
    } catch (_) {
    } finally {
      setLoading(false);
    }
  }

  function handleScrollToLower() {
    if (orders.length < total && !loading) {
      loadOrders(page + 1);
    }
  }

  return (
    <View className="group-orders-page">
      <ScrollView scrollY className="scroll-area" onScrollToLower={handleScrollToLower} lowerThreshold={100}>
        {orders.map((item) => {
          const group = item.group;
          const product = group.activity.product;
          const image = product.images?.[0] || '';
          const imageSrc = image.startsWith('http') ? image : `${BASE_URL}${image}`;
          return (
            <View key={item.id} className="order-card">
              <View className="order-header">
                <Text className="order-no">订单号: {item.order.orderNo}</Text>
                <Text className="order-status" style={{ color: statusColorMap[group.status] || '#999' }}>
                  {statusMap[group.status] || group.status}
                </Text>
              </View>
              <View className="order-body">
                {image ? (
                  <Image className="order-image" src={imageSrc} mode="aspectFill" />
                ) : (
                  <View className="order-image-placeholder" />
                )}
                <View className="order-info">
                  <Text className="order-name">{product.name}</Text>
                  <Text className="order-price">¥{Number(item.order.payAmount).toFixed(2)}</Text>
                  <View className="order-members">
                    <Text className="members-text">
                      {group.members.length}/{group.activity.groupSize}人
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          );
        })}
        {loading && <View className="loading-tip"><Text>加载中...</Text></View>}
        {!loading && orders.length >= total && orders.length > 0 && (
          <View className="end-tip"><Text>已加载全部</Text></View>
        )}
        {!loading && orders.length === 0 && (
          <View className="empty-tip"><Text>暂无拼团订单</Text></View>
        )}
      </ScrollView>
    </View>
  );
}
