import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useState, useEffect, useCallback } from 'react';
import { request } from '../../utils/request';
import './index.scss';

interface CouponItem {
  id: string;
  name: string;
  type: 'AMOUNT' | 'DISCOUNT';
  value: number;
  minAmount: number;
  startTime: string;
  endTime: string;
  status: 'ACTIVE' | 'INACTIVE';
  claimed?: boolean;
}

interface MyCouponItem {
  id: string;
  couponId: string;
  coupon: {
    name: string;
    type: 'AMOUNT' | 'DISCOUNT';
    value: number;
    minAmount: number;
    startTime: string;
    endTime: string;
  };
  status: 'UNUSED' | 'USED' | 'EXPIRED';
  usedAt?: string;
  createdAt: string;
}

type TabKey = 'available' | 'mine';
type MyCouponFilter = 'UNUSED' | 'USED' | 'EXPIRED';

export default function Coupons() {
  const [activeTab, setActiveTab] = useState<TabKey>('available');
  const [availableList, setAvailableList] = useState<CouponItem[]>([]);
  const [myList, setMyList] = useState<MyCouponItem[]>([]);
  const [myFilter, setMyFilter] = useState<MyCouponFilter>('UNUSED');
  const [loading, setLoading] = useState(false);

  const fetchAvailable = useCallback(async () => {
    try {
      setLoading(true);
      const res = await request<CouponItem[]>({ url: '/coupons/available' });
      setAvailableList(res);
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMyCoupons = useCallback(async () => {
    try {
      setLoading(true);
      const res = await request<MyCouponItem[]>({ url: '/coupons/my' });
      setMyList(res);
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAvailable();
  }, [fetchAvailable]);

  useEffect(() => {
    if (activeTab === 'mine') {
      fetchMyCoupons();
    }
  }, [activeTab, fetchMyCoupons]);

  const handleClaim = async (coupon: CouponItem) => {
    try {
      await request({ url: `/coupons/${coupon.id}/claim`, method: 'POST' });
      Taro.showToast({ title: '领取成功', icon: 'success' });
      setAvailableList((prev) =>
        prev.map((c) => (c.id === coupon.id ? { ...c, claimed: true } : c))
      );
    } catch (e) {
      // error already handled by request util
    }
  };

  const formatDate = (iso: string) => {
    return iso.slice(0, 10);
  };

  const formatValue = (type: 'AMOUNT' | 'DISCOUNT', value: number) => {
    if (type === 'AMOUNT') {
      return { main: `¥${value}`, sub: '' };
    }
    const discount = Math.round(value * 10);
    return { main: `${discount}折`, sub: '' };
  };

  const filteredMyList = myList.filter((c) => c.status === myFilter);

  const renderAvailableCard = (coupon: CouponItem) => {
    const { main } = formatValue(coupon.type, coupon.value);
    const condition = `满${coupon.minAmount}可用`;

    return (
      <View className={`coupon-card ${coupon.claimed ? 'coupon-card--inactive' : ''}`} key={coupon.id}>
        <View className="coupon-card__left">
          <Text className="coupon-card__value">{main}</Text>
          <Text className="coupon-card__condition">{condition}</Text>
        </View>
        <View className="coupon-card__right">
          <Text className="coupon-card__name">{coupon.name}</Text>
          <Text className="coupon-card__date">
            {formatDate(coupon.startTime)} ~ {formatDate(coupon.endTime)}
          </Text>
          {coupon.claimed ? (
            <View className="coupon-card__btn coupon-card__btn--disabled">
              <Text className="coupon-card__btn-text coupon-card__btn-text--disabled">已领取</Text>
            </View>
          ) : (
            <View className="coupon-card__btn" onClick={() => handleClaim(coupon)}>
              <Text className="coupon-card__btn-text">领取</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderMyCouponCard = (item: MyCouponItem) => {
    const { main } = formatValue(item.coupon.type, item.coupon.value);
    const condition = `满${item.coupon.minAmount}可用`;
    const isInactive = item.status === 'USED' || item.status === 'EXPIRED';

    return (
      <View className={`coupon-card ${isInactive ? 'coupon-card--inactive' : ''}`} key={item.id}>
        <View className="coupon-card__left">
          <Text className="coupon-card__value">{main}</Text>
          <Text className="coupon-card__condition">{condition}</Text>
        </View>
        <View className="coupon-card__right">
          <Text className="coupon-card__name">{item.coupon.name}</Text>
          <Text className="coupon-card__date">
            {formatDate(item.coupon.startTime)} ~ {formatDate(item.coupon.endTime)}
          </Text>
          {isInactive && (
            <View className="coupon-card__status-tag">
              <Text className="coupon-card__status-text">
                {item.status === 'USED' ? '已使用' : '已过期'}
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
        <ScrollView scrollY className="coupons__scroll">
          <View className="coupons__list">
            {availableList.length === 0 && !loading ? (
              <View className="coupons__empty">
                <Text className="coupons__empty-text">暂无可领取的优惠券</Text>
              </View>
            ) : (
              availableList.map((coupon) => renderAvailableCard(coupon))
            )}
          </View>
        </ScrollView>
      )}

      {/* My coupons tab */}
      {activeTab === 'mine' && (
        <View className="coupons__mine">
          <View className="coupons__filter">
            <View
              className={`coupons__filter-item ${myFilter === 'UNUSED' ? 'coupons__filter-item--active' : ''}`}
              onClick={() => setMyFilter('UNUSED')}
            >
              <Text className="coupons__filter-text">未使用</Text>
            </View>
            <View
              className={`coupons__filter-item ${myFilter === 'USED' ? 'coupons__filter-item--active' : ''}`}
              onClick={() => setMyFilter('USED')}
            >
              <Text className="coupons__filter-text">已使用</Text>
            </View>
            <View
              className={`coupons__filter-item ${myFilter === 'EXPIRED' ? 'coupons__filter-item--active' : ''}`}
              onClick={() => setMyFilter('EXPIRED')}
            >
              <Text className="coupons__filter-text">已过期</Text>
            </View>
          </View>
          <ScrollView scrollY className="coupons__scroll">
            <View className="coupons__list">
              {filteredMyList.length === 0 && !loading ? (
                <View className="coupons__empty">
                  <Text className="coupons__empty-text">暂无优惠券</Text>
                </View>
              ) : (
                filteredMyList.map((item) => renderMyCouponCard(item))
              )}
            </View>
          </ScrollView>
        </View>
      )}
    </View>
  );
}
