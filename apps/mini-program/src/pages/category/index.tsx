import { View, Text, Image, ScrollView } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { useState, useEffect } from 'react';
import { request } from '../../utils/request';
import './index.scss';

interface Category {
  id: string;
  name: string;
  children?: Category[];
}

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

function getLowestPrice(skus: Sku[]): number {
  let lowest = Infinity;
  for (const sku of skus) {
    for (const p of sku.prices) {
      if (p.price < lowest) lowest = p.price;
    }
  }
  return lowest === Infinity ? 0 : lowest;
}

export default function Category() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [products, setProducts] = useState<Product[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [keyword, setKeyword] = useState('');

  useDidShow(() => {
    const params = Taro.getCurrentInstance().router?.params || {};
    const kw = params.keyword ? decodeURIComponent(params.keyword as string) : '';
    const catId = (params.categoryId as string) || '';
    setKeyword(kw);
    loadCategories(catId);
  });

  async function loadCategories(initialCatId?: string) {
    try {
      const data = await request<Category[]>({ url: '/categories' });
      setCategories(data);
      const firstId = initialCatId || data[0]?.id || '';
      setSelectedId(firstId);
    } catch (_) {}
  }

  useEffect(() => {
    if (selectedId || keyword) {
      setPage(1);
      setProducts([]);
      loadProducts(1, true);
    }
  }, [selectedId, keyword]);

  async function loadProducts(pageNum: number, replace = false) {
    if (loading) return;
    setLoading(true);
    try {
      const params: string[] = [`page=${pageNum}`, 'pageSize=20'];
      if (selectedId) params.push(`categoryId=${selectedId}`);
      if (keyword) params.push(`keyword=${encodeURIComponent(keyword)}`);
      const data = await request<{ items: Product[]; total: number; page: number; pageSize: number }>({
        url: `/products?${params.join('&')}`,
      });
      setTotal(data.total);
      setProducts((prev) => (replace ? data.items : [...prev, ...data.items]));
      setPage(pageNum);
    } catch (_) {
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    setPage(1);
    await loadProducts(1, true);
    setRefreshing(false);
    Taro.stopPullDownRefresh();
  }

  function handleScrollToLower() {
    const hasMore = products.length < total;
    if (hasMore && !loading) {
      loadProducts(page + 1);
    }
  }

  function goToProduct(id: string) {
    Taro.navigateTo({ url: `/pages/product-detail/index?id=${id}` });
  }

  return (
    <View className="category-page">
      {/* Left sidebar */}
      <ScrollView scrollY className="sidebar">
        {categories.map((cat) => (
          <View
            key={cat.id}
            className={`sidebar-item ${selectedId === cat.id ? 'active' : ''}`}
            onClick={() => setSelectedId(cat.id)}
          >
            <Text className="sidebar-text">{cat.name}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Right product grid */}
      <ScrollView
        scrollY
        className="product-area"
        refresherEnabled
        refresherTriggered={refreshing}
        onRefresherRefresh={handleRefresh}
        onScrollToLower={handleScrollToLower}
        lowerThreshold={100}
      >
        {keyword ? (
          <View className="keyword-tip">
            <Text>搜索: {keyword}</Text>
          </View>
        ) : null}

        <View className="product-grid">
          {products.map((product) => {
            const price = getLowestPrice(product.skus);
            const image = product.images?.[0] || '';
            return (
              <View key={product.id} className="product-card" onClick={() => goToProduct(product.id)}>
                {image ? (
                  <Image className="product-image" src={image} mode="aspectFill" />
                ) : (
                  <View className="product-image-placeholder" />
                )}
                <View className="product-info">
                  <Text className="product-name">{product.name}</Text>
                  <Text className="product-price">¥{price.toFixed(2)}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {loading && (
          <View className="loading-tip">
            <Text>加载中...</Text>
          </View>
        )}
        {!loading && products.length > 0 && products.length >= total && (
          <View className="end-tip">
            <Text>已加载全部</Text>
          </View>
        )}
        {!loading && products.length === 0 && (
          <View className="empty-tip">
            <Text>暂无商品</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
