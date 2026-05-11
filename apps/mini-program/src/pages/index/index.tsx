import { View, Text, Image, ScrollView, Input } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { useState } from 'react';
import { request, BASE_URL } from '../../utils/request';
import { useAuthStore } from '../../store/auth';
import './index.scss';

interface PriceItem {
  priceType: string;
  price: number;
}

interface Sku {
  id: string;
  specs: Record<string, string>;
  stock: number;
  costPrice: number;
  prices: PriceItem[];
}

interface Product {
  id: string;
  name: string;
  images: string[];
  skus: Sku[];
}

interface GroupBuyActivity {
  id: string;
  productId: string;
  groupPrice: number;
  groupSize: number;
  product: Product;
  sku: Sku;
  groups: { id: string; members: any[] }[];
}

interface CommunityPost {
  id: string;
  content: string;
  images: string[];
  user: { nickname: string; avatar: string };
  createdAt: string;
}

function getLowestPrice(skus: Sku[]): number {
  let lowest = Infinity;
  for (const sku of skus) {
    for (const p of sku.prices) {
      const val = Number(p.price);
      if (val < lowest) lowest = val;
    }
  }
  return lowest === Infinity ? 0 : lowest;
}

export default function Index() {
  const [keyword, setKeyword] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [groupActivities, setGroupActivities] = useState<GroupBuyActivity[]>([]);
  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(false);
  const token = useAuthStore((s) => s.token);

  useDidShow(() => {
    loadProducts();
    loadGroupActivities();
    loadCommunityPosts();
  });

  async function loadProducts() {
    setLoading(true);
    try {
      const data = await request<{ items: Product[]; total: number }>({
        url: '/products?page=1&pageSize=10&status=ON_SALE',
      });
      setProducts(data.items);
    } catch (_) {
    } finally {
      setLoading(false);
    }
  }

  async function loadGroupActivities() {
    try {
      const data = await request<{ items: GroupBuyActivity[] }>({
        url: '/group-buy/activities?page=1&pageSize=4',
      });
      setGroupActivities(data.items);
    } catch (_) {}
  }

  async function loadCommunityPosts() {
    try {
      const data = await request<{ items: CommunityPost[] }>({
        url: '/community/posts?page=1&pageSize=4',
      });
      setCommunityPosts(data.items);
    } catch (_) {}
  }

  function handleSearch() {
    if (!keyword.trim()) return;
    Taro.navigateTo({ url: `/pages/search/index?keyword=${encodeURIComponent(keyword.trim())}` });
  }

  function goToProduct(id: string) {
    Taro.navigateTo({ url: `/pages/product-detail/index?id=${id}` });
  }

  function goToGroupBuy(activityId: string) {
    Taro.navigateTo({ url: `/pages/group-buy-detail/index?id=${activityId}` });
  }

  return (
    <View className="index-page">
      {/* Search bar */}
      <View className="search-bar">
        <Input
          className="search-input"
          placeholder="搜索商品"
          value={keyword}
          onInput={(e) => setKeyword(e.detail.value)}
          confirmType="search"
          onConfirm={handleSearch}
        />
      </View>

      <ScrollView scrollY className="page-scroll">
        {/* Banner */}
        <View className="banner">
          <View className="banner-placeholder">
            <View className="banner-content">
              <Text className="banner-title">精选好货</Text>
              <Text className="banner-subtitle">品质生活 · 每日上新</Text>
            </View>
            <View className="banner-decoration"></View>
          </View>
        </View>


        {/* Group buy section */}
        {groupActivities.length > 0 && (
          <View className="section">
            <View className="section-title">
              <Text>拼团专区</Text>
              <Text className="section-more" onClick={() => Taro.navigateTo({ url: '/pages/group-buy-list/index' })}>更多</Text>
            </View>
            <ScrollView scrollX className="group-buy-scroll">
              <View className="group-buy-list">
                {groupActivities.map((activity) => {
                  const image = activity.product.images?.[0] || '';
                  const imageSrc = image.startsWith('http') ? image : `${BASE_URL}${image}`;
                  const originalPrice = getLowestPrice(activity.product.skus);
                  return (
                    <View key={activity.id} className="group-buy-card" onClick={() => goToGroupBuy(activity.id)}>
                      <View className="group-buy-tag">{activity.groupSize}人团</View>
                      {image ? (
                        <Image className="group-buy-image" src={imageSrc} mode="aspectFill" />
                      ) : (
                        <View className="group-buy-image-placeholder" />
                      )}
                      <View className="group-buy-info">
                        <Text className="group-buy-name">{activity.product.name}</Text>
                        {token ? (
                          <View className="group-buy-prices">
                            <Text className="group-buy-price">¥{Number(activity.groupPrice).toFixed(2)}</Text>
                            <Text className="group-buy-original">¥{originalPrice.toFixed(2)}</Text>
                          </View>
                        ) : (
                          <Text className="group-buy-login-hint">登录后查看价格</Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Hot products */}
        <View className="section">
          <View className="section-title">
            <Text>热门商品</Text>
          </View>
          {loading ? (
            <View className="loading">
              <Text>加载中...</Text>
            </View>
          ) : (
            <View className="product-grid">
              {products.map((product) => {
                const price = getLowestPrice(product.skus);
                const image = product.images?.[0] || '';
                const imageSrc = image.startsWith('http') ? image : `${BASE_URL}${image}`;
                return (
                  <View key={product.id} className="product-card" onClick={() => goToProduct(product.id)}>
                    {image ? (
                      <Image className="product-image" src={imageSrc} mode="aspectFill" />
                    ) : (
                      <View className="product-image-placeholder" />
                    )}
                    <View className="product-info">
                      <Text className="product-name">{product.name}</Text>
                      {token ? (
                        <Text className="product-price">¥{price.toFixed(2)}</Text>
                      ) : (
                        <Text className="product-login-hint">登录后查看</Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Community / 买家秀 */}
        {communityPosts.length > 0 && (
          <View className="section">
            <View className="section-title">
              <Text>买家秀</Text>
              <Text className="section-more" onClick={() => Taro.switchTab({ url: '/pages/community/index' })}>更多</Text>
            </View>
            <View className="community-list">
              {communityPosts.map((post) => (
                <View key={post.id} className="community-card">
                  <View className="community-header">
                    {post.user.avatar ? (
                      <Image className="community-avatar" src={post.user.avatar.startsWith('http') ? post.user.avatar : `${BASE_URL}${post.user.avatar}`} />
                    ) : (
                      <View className="community-avatar-placeholder" />
                    )}
                    <Text className="community-nickname">{post.user.nickname || '匿名用户'}</Text>
                  </View>
                  <Text className="community-content">{post.content}</Text>
                  {post.images && post.images.length > 0 && (
                    <View className="community-images">
                      {post.images.slice(0, 3).map((img, idx) => (
                        <Image
                          key={idx}
                          className="community-img"
                          src={img.startsWith('http') ? img : `${BASE_URL}${img}`}
                          mode="aspectFill"
                        />
                      ))}
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
