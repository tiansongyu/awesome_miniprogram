import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useState, useEffect } from 'react';
import './index.scss';

interface Coupon {
  id: string;
  name: string;
  type: 'amount' | 'discount';
  value: number;
  minSpend: number;
  startDate: string;
  endDate: string;
  description?: string;
}

interface MyCoupon extends Coupon {
  status: 'unused' | 'used' | 'expired';
  receivedAt: string;
}

const MOCK_AVAILABLE: Coupon[] = [
  { id: '1', name: '新人专享券', type: 'amount', value: 20, minSpend: 100, startDate: '2026-05-01', endDate: '2026-06-30', description: '全场通用' },
  { id: '2', name: '满减优惠', type: 'amount', value: 50, minSpend: 300, startDate: '2026-05-01', endDate: '2026-05-31', description: '部分商品可用' },
  { id: '3', name: '会员折扣券', type: 'discount', value: 8.5, minSpend: 200, startDate: '2026-05-01', endDate: '2026-06-15', description: '全场通用' },
];

const MOCK_MY_COUPONS: MyCoupon[] = [
  { id: '4', name: '开业大促券', type: 'amount', value: 10, minSpend: 50, startDate: '2026-05-01', endDate: '2026-06-30', status: 'unused', receivedAt: '2026-05-05', description: '全场通用' },
  { id: '5', name: '限时折扣', type: 'discount', value: 9, minSpend: 100, startDate: '2026-04-01', endDate: '2026-04-30', status: 'expired', receivedAt: '2026-04-01', description: '全场通用' },
  { id: '6', name: '满减券', type: 'amount', value: 30, minSpend: 200, startDate: '2026-03-01', endDate: '2026-03-31', status: 'used', receivedAt: '2026-03-01', description: '部分商品可用' },
];

type TabKey = 'available' | 'mine';
type MyCouponFilter = 'unused' | 'used' | 'expired';

export default function Coupons() {
  const [activeTab, setActiveTab] = useState<TabKey>('available');
  const [availableList, setAvailableList] = useState<Coupon[]>([]);
  const [myList, setMyList] = useState<MyCoupon[]>([]);
  const [myFilter, setMyFilter] = useState<MyCouponFilter>('unused');

  useEffect(() => {
    // TODO: replace with real API calls
    setAvailableList(MOCK_AVAILABLE);
    setMyList(MOCK_MY_COUPONS);
  }, []);

  const handleClaim = (coupon: Coupon) => {
    Taro.showToast({ title: '领取成功', icon: 'success' });
    setAvailableList((prev) => prev.filter((c) => c.id !== coupon.id));
    const claimed: MyCoupon = { ...coupon, status: 'unused', receivedAt: new Date().toISOString().slice(0, 10) };
    setMyList((prev) => [claimed, ...prev]);
  };

  const formatValue = (coupon: Coupon) => {
    if (coupon.type === 'amount') {
      return { main: `¥${coupon.value}`, sub: `满${coupon.minSpend}可用` };
    }
    return { main: `${coupon.value}折`, sub: `满${coupon.minSpend}可用` };
  };

  const filteredMyList = myList.filter((c) => c.status === myFilter);

  const renderCouponCard = (coupon: Coupon | MyCoupon, showClaimBtn: boolean) => {
    const { main, sub } = formatValue(coupon);
    const status = 'status' in coupon ? coupon.status : 'unused';
    const isInactive = status === 'used' || status === 'expired';

    return (
      <View className={`coupon-card ${isInactive ? 'coupon-card--inactive' : ''}`} key={coupon.id}>
        <View className="coupon-card__left">
          <Text className="coupon-card__value">{main}</Text>
          <Text className="coupon-card__condition">{sub}</Text>
        </View>
        <View className="coupon-card__right">
          <Text className="coupon-card__name">{coupon.name}</Text>
          <Text className="coupon-card__desc">{coupon.description || ''}</Text>
          <Text className="coupon-card__date">
            {coupon.startDate} ~ {coupon.endDate}
          </Text>
          {showClaimBtn && (
            <View className="coupon-card__btn" onClick={() => handleClaim(coupon)}>
              <Text className="coupon-card__btn-text">立即领取</Text>
            </View>
          )}
          {isInactive && (
            <View className="coupon-card__status-tag">
              <Text className="coupon-card__status-text">
                {status === 'used' ? '已使用' : '已过期'}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View className="coupons">
      {/* Tabs */}
      <View className="coupons__tabs">
        <View
          className={`coupons__tab ${activeTab === 'available' ? 'coupons__tab--active' : ''}`}
          onClick={() => setActiveTab('available')}
        >
          <Text className="coupons__tab-text">可领取</Text>
        </View>
        <View
          className={`coupons__tab ${activeTab === 'mine' ? 'coupons__tab--active' : ''}`}
          onClick={() => setActiveTab('mine')}
        >
          <Text className="coupons__tab-text">我的优惠券</Text>
        </View>
      </View>

      {/* Available tab */}
      {activeTab === 'available' && (
        <View className="coupons__list">
          {availableList.length === 0 ? (
            <View className="coupons__empty">
              <Text className="coupons__empty-text">暂无可领取的优惠券</Text>
            </View>
          ) : (
            availableList.map((coupon) => renderCouponCard(coupon, true))
          )}
        </View>
      )}

      {/* My coupons tab */}
      {activeTab === 'mine' && (
        <View className="coupons__mine">
          <View className="coupons__filter">
            <View
              className={`coupons__filter-item ${myFilter === 'unused' ? 'coupons__filter-item--active' : ''}`}
              onClick={() => setMyFilter('unused')}
            >
              <Text className="coupons__filter-text">未使用</Text>
            </View>
            <View
              className={`coupons__filter-item ${myFilter === 'used' ? 'coupons__filter-item--active' : ''}`}
              onClick={() => setMyFilter('used')}
            >
              <Text className="coupons__filter-text">已使用</Text>
            </View>
            <View
              className={`coupons__filter-item ${myFilter === 'expired' ? 'coupons__filter-item--active' : ''}`}
              onClick={() => setMyFilter('expired')}
            >
              <Text className="coupons__filter-text">已过期</Text>
            </View>
          </View>
          <View className="coupons__list">
            {filteredMyList.length === 0 ? (
              <View className="coupons__empty">
                <Text className="coupons__empty-text">暂无优惠券</Text>
              </View>
            ) : (
              filteredMyList.map((coupon) => renderCouponCard(coupon, false))
            )}
          </View>
        </View>
      )}
    </View>
  );
}
