import { View, Text, Image, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useState, useEffect } from 'react';
import { request, BASE_URL } from '../../utils/request';
import './index.scss';

interface GroupBuyActivity {
  id: string;
  groupPrice: number;
  groupSize: number;
  endTime: string;
  product: { id: string; name: string; images: string[]; skus: any[] };
  groups: { id: string; members: any[] }[];
}

function getLowestPrice(skus: any[]): number {
  let lowest = Infinity;
  for (const sku of skus) {
    for (const p of sku.prices || []) {
      const val = Number(p.price);
      if (val < lowest) lowest = val;
    }
  }
  return lowest === Infinity ? 0 : lowest;
}

export default function GroupBuyListPage() {
  const [activities, setActivities] = useState<GroupBuyActivity[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadActivities(1, true);
  }, []);

  async function loadActivities(pageNum: number, replace = false) {
    if (loading) return;
    setLoading(true);
    try {
      const data = await request<{ items: GroupBuyActivity[]; total: number }>({
        url: `/group-buy/activities?page=${pageNum}&pageSize=20`,
      });
      setTotal(data.total);
      setActivities((prev) => (replace ? data.items : [...prev, ...data.items]));
      setPage(pageNum);
    } catch (_) {
    } finally {
      setLoading(false);
    }
  }

  function handleScrollToLower() {
    if (activities.length < total && !loading) {
      loadActivities(page + 1);
    }
  }

  function goToDetail(id: string) {
    Taro.navigateTo({ url: `/pages/group-buy-detail/index?id=${id}` });
  }

  return (
    <View className="group-buy-list-page">
      <ScrollView scrollY className="scroll-area" onScrollToLower={handleScrollToLower} lowerThreshold={100}>
        <View className="activity-list">
          {activities.map((activity) => {
            const image = activity.product.images?.[0] || '';
            const imageSrc = image.startsWith('http') ? image : `${BASE_URL}${image}`;
            const originalPrice = getLowestPrice(activity.product.skus);
            const pendingGroups = activity.groups?.length || 0;
            return (
              <View key={activity.id} className="activity-card" onClick={() => goToDetail(activity.id)}>
                {image ? (
                  <Image className="activity-image" src={imageSrc} mode="aspectFill" />
                ) : (
                  <View className="activity-image-placeholder" />
                )}
                <View className="activity-info">
                  <Text className="activity-name">{activity.product.name}</Text>
                  <View className="activity-tag">
                    <Text className="tag-text">{activity.groupSize}人团</Text>
                  </View>
                  <View className="activity-prices">
                    <Text className="group-price">¥{Number(activity.groupPrice).toFixed(2)}</Text>
                    <Text className="original-price">¥{originalPrice.toFixed(2)}</Text>
                  </View>
                  <Text className="activity-groups">{pendingGroups}个团进行中</Text>
                </View>
              </View>
            );
          })}
        </View>
        {loading && <View className="loading-tip"><Text>加载中...</Text></View>}
        {!loading && activities.length >= total && activities.length > 0 && (
          <View className="end-tip"><Text>已加载全部</Text></View>
        )}
        {!loading && activities.length === 0 && (
          <View className="empty-tip"><Text>暂无拼团活动</Text></View>
        )}
      </ScrollView>
    </View>
  );
}
