import { View, Text, Image } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { useState } from 'react';
import { request, BASE_URL } from '../../utils/request';
import './index.scss';

function fullUrl(url: string) {
  if (!url) return '';
  return url.startsWith('http') ? url : `${BASE_URL}${url}`;
}

interface FavoriteItem {
  id: string;
  productId: string;
  product: {
    id: string;
    name: string;
    images: string[];
    skus: {
      prices: { priceType: string; price: number }[];
    }[];
  };
}

function getRetailPrice(item: FavoriteItem): string {
  const sku = item.product.skus?.[0];
  if (!sku) return '--';
  const retail = sku.prices.find((p) => p.priceType === 'RETAIL');
  const price = retail ? retail.price : sku.prices[0]?.price;
  return price != null ? `¥${Number(price).toFixed(2)}` : '--';
}

export default function Favorites() {
  const [items, setItems] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [touchStartX, setTouchStartX] = useState(0);
  const [slideId, setSlideId] = useState<string | null>(null);

  useDidShow(() => {
    loadFavorites();
  });

  async function loadFavorites() {
    setLoading(true);
    try {
      const res = await request<{ items: FavoriteItem[]; total: number }>({
        url: '/favorites',
      });
      setItems(res.items);
    } catch (_) {}
    finally {
      setLoading(false);
    }
  }

  async function handleRemove(productId: string) {
    try {
      await request({ url: `/favorites/${productId}`, method: 'DELETE' });
      setItems((prev) => prev.filter((i) => i.productId !== productId));
      setSlideId(null);
      Taro.showToast({ title: '已取消收藏', icon: 'none' });
    } catch (_) {}
  }

  function handleTouchStart(e: any, id: string) {
    setTouchStartX(e.touches[0].clientX);
    if (slideId && slideId !== id) {
      setSlideId(null);
    }
  }

  function handleTouchEnd(e: any, id: string) {
    const endX = e.changedTouches[0].clientX;
    const diff = touchStartX - endX;
    if (diff > 60) {
      setSlideId(id);
    } else if (diff < -60) {
      setSlideId(null);
    }
  }

  function navigateToDetail(productId: string) {
    Taro.navigateTo({ url: `/pages/product-detail/index?id=${productId}` });
  }

  if (loading && items.length === 0) {
    return (
      <View className="favorites-page favorites-page--loading">
        <Text>加载中...</Text>
      </View>
    );
  }

  if (!loading && items.length === 0) {
    return (
      <View className="favorites-page favorites-page--empty">
        <Text className="empty-icon">♡</Text>
        <Text className="empty-text">暂无收藏</Text>
        <Text className="empty-hint">去逛逛，收藏喜欢的商品吧</Text>
      </View>
    );
  }

  return (
    <View className="favorites-page">
      {items.map((item) => (
        <View
          key={item.id}
          className={`favorite-item ${slideId === item.id ? 'slide-open' : ''}`}
        >
          <View
            className="favorite-item__content"
            onTouchStart={(e) => handleTouchStart(e, item.id)}
            onTouchEnd={(e) => handleTouchEnd(e, item.id)}
            onClick={() => navigateToDetail(item.productId)}
          >
            <Image
              className="favorite-item__image"
              src={fullUrl(item.product.images?.[0] || '')}
              mode="aspectFill"
            />
            <View className="favorite-item__info">
              <Text className="favorite-item__name">{item.product.name}</Text>
              <Text className="favorite-item__price">{getRetailPrice(item)}</Text>
            </View>
          </View>
          <View
            className="favorite-item__delete"
            onClick={() => handleRemove(item.productId)}
          >
            <Text>删除</Text>
          </View>
        </View>
      ))}
    </View>
  );
}
