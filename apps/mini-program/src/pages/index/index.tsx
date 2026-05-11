import { View, Text, Image, ScrollView } from '@tarojs/components';
import { SearchBar } from '@nutui/nutui-react-taro';
import Taro, { useDidShow } from '@tarojs/taro';
import { useState } from 'react';
import { request, BASE_URL } from '../../utils/request';
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
      const val = Number(p.price);
      if (val < lowest) lowest = val;
    }
  }
  return lowest === Infinity ? 0 : lowest;
}

export default function Index() {
  const [keyword, setKeyword] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  useDidShow(() => {
    loadCategories();
    loadProducts();
  });

  async function loadCategories() {
    try {
      const data = await request<Category[]>({ url: '/categories' });
      setCategories(data.slice(0, 8));
    } catch (_) {}
  }

  async function loadProducts() {
    setLoading(true);
    try {
      const data = await request<{ items: Product[]; total: number; page: number; pageSize: number }>({
        url: '/products?page=1&pageSize=10&status=ON_SALE',
      });
      setProducts(data.items);
    } catch (_) {
    } finally {
      setLoading(false);
    }
  }

  function handleSearch() {
    if (!keyword.trim()) return;
    Taro.navigateTo({ url: `/pages/category/index?keyword=${encodeURIComponent(keyword.trim())}` });
  }

  function goToCategory(categoryId: string) {
    Taro.navigateTo({ url: `/pages/category/index?categoryId=${categoryId}` });
  }

  function goToProduct(id: string) {
    Taro.navigateTo({ url: `/pages/product-detail/index?id=${id}` });
  }

  return (
    <View className="index-page">
      {/* Search bar */}
      <View className="search-bar">
        <SearchBar
          placeholder="搜索商品"
          value={keyword}
          onChange={(val) => setKeyword(val)}
          onSearch={handleSearch}
          shape="round"
          className="search-bar-input"
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

        {/* Category quick links */}
        {categories.length > 0 && (
          <View className="section">
            <View className="section-title">
              <Text>商品分类</Text>
            </View>
            <ScrollView scrollX className="category-scroll">
              <View className="category-list">
                {categories.map((cat) => (
                  <View key={cat.id} className="category-item" onClick={() => goToCategory(cat.id)}>
                    <View className="category-icon">
                      <Text className="category-icon-text">{cat.name.charAt(0)}</Text>
                    </View>
                    <Text className="category-name">{cat.name}</Text>
                  </View>
                ))}
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
                      <Text className="product-price">¥{price.toFixed(2)}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
