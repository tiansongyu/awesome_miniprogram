import { View, Text, Image } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { useState, useEffect } from 'react';
import { request, BASE_URL } from '../../utils/request';
import { useAuthStore } from '../../store/auth';
import './index.scss';

interface GroupMember {
  id: string;
  userId: string;
  user: { id: string; nickname: string; avatar: string };
}

interface GroupItem {
  id: string;
  status: string;
  expireAt: string;
  members: GroupMember[];
  leader: { id: string; nickname: string; avatar: string };
}

interface ActivityDetail {
  id: string;
  groupPrice: number;
  groupSize: number;
  duration: number;
  endTime: string;
  product: { id: string; name: string; images: string[]; description: string; skus: any[] };
  sku: { id: string; specs: any; prices: any[] };
  groups: GroupItem[];
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

function getCountdown(expireAt: string): string {
  const diff = new Date(expireAt).getTime() - Date.now();
  if (diff <= 0) return '已过期';
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  return `${hours}时${minutes}分`;
}

export default function GroupBuyDetailPage() {
  const router = useRouter();
  const [activity, setActivity] = useState<ActivityDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    const id = router.params.id;
    if (id) loadActivity(id);
  }, []);

  async function loadActivity(id: string) {
    try {
      const data = await request<ActivityDetail>({
        url: `/group-buy/activities/${id}`,
      });
      setActivity(data);
    } catch (_) {
    } finally {
      setLoading(false);
    }
  }

  async function handleInitiate() {
    if (!token) {
      Taro.switchTab({ url: '/pages/profile/index' });
      return;
    }
    try {
      await request({
        url: '/group-buy/initiate',
        method: 'POST',
        data: { activityId: activity!.id },
      });
      Taro.showToast({ title: '开团成功', icon: 'success' });
      loadActivity(activity!.id);
    } catch (_) {
      Taro.showToast({ title: '开团失败', icon: 'none' });
    }
  }

  async function handleJoin(groupId: string) {
    if (!token) {
      Taro.switchTab({ url: '/pages/profile/index' });
      return;
    }
    try {
      await request({
        url: '/group-buy/join',
        method: 'POST',
        data: { groupId },
      });
      Taro.showToast({ title: '参团成功', icon: 'success' });
      loadActivity(activity!.id);
    } catch (_) {
      Taro.showToast({ title: '参团失败', icon: 'none' });
    }
  }

  if (loading) {
    return <View className="group-buy-detail-page"><View className="loading"><Text>加载中...</Text></View></View>;
  }

  if (!activity) {
    return <View className="group-buy-detail-page"><View className="loading"><Text>活动不存在</Text></View></View>;
  }

  const image = activity.product.images?.[0] || '';
  const imageSrc = image.startsWith('http') ? image : `${BASE_URL}${image}`;
  const originalPrice = getLowestPrice(activity.product.skus);

  return (
    <View className="group-buy-detail-page">
      {/* Product info */}
      <View className="product-section">
        {image && <Image className="product-image" src={imageSrc} mode="aspectFill" />}
        <View className="product-info">
          <Text className="product-name">{activity.product.name}</Text>
          <View className="price-row">
            <View className="group-price-box">
              <Text className="label">拼团价</Text>
              <Text className="price">¥{Number(activity.groupPrice).toFixed(2)}</Text>
            </View>
            <View className="original-price-box">
              <Text className="label">单买价</Text>
              <Text className="price">¥{originalPrice.toFixed(2)}</Text>
            </View>
          </View>
          <View className="rule-row">
            <Text className="rule">{activity.groupSize}人成团 · 有效期{activity.duration}小时</Text>
          </View>
        </View>
      </View>

      {/* Pending groups */}
      <View className="groups-section">
        <View className="section-header">
          <Text className="section-title">正在拼团</Text>
          <Text className="section-count">{activity.groups.length}个团</Text>
        </View>
        {activity.groups.length === 0 ? (
          <View className="no-groups"><Text>暂无进行中的团，快来开团吧</Text></View>
        ) : (
          activity.groups.map((group) => (
            <View key={group.id} className="group-card">
              <View className="group-leader">
                {group.leader.avatar ? (
                  <Image className="leader-avatar" src={group.leader.avatar} />
                ) : (
                  <View className="leader-avatar-placeholder" />
                )}
                <Text className="leader-name">{group.leader.nickname || '用户'}</Text>
              </View>
              <View className="group-meta">
                <Text className="group-need">还差{activity.groupSize - group.members.length}人</Text>
                <Text className="group-countdown">{getCountdown(group.expireAt)}</Text>
              </View>
              <View className="group-join-btn" onClick={() => handleJoin(group.id)}>
                <Text>去拼团</Text>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Bottom action */}
      <View className="bottom-bar">
        <View className="btn-product" onClick={() => Taro.navigateTo({ url: `/pages/product-detail/index?id=${activity.product.id}` })}>
          <Text>单独购买</Text>
        </View>
        <View className="btn-initiate" onClick={handleInitiate}>
          <Text>我要开团 ¥{Number(activity.groupPrice).toFixed(2)}</Text>
        </View>
      </View>
    </View>
  );
}
