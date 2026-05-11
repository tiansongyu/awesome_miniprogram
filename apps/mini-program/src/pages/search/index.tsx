import { View, Text, Image, Input } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { useState, useEffect } from 'react';
import { request, BASE_URL } from '../../utils/request';
import './index.scss';

interface Product {
  id: string;
  name: string;
  price: string;
  images: string[];
}

export default function SearchPage() {
  const router = useRouter();
  const [keyword, setKeyword] = useState(decodeURIComponent(router.params.keyword || ''));
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  const doSearch = async (kw: string) => {
    if (!kw.trim()) return;
    setLoading(true);
    try {
      const res = await request<{ items: Product[] }>({
        url: `/products?keyword=${encodeURIComponent(kw.trim())}&pageSize=20`,
      });
      setProducts(res.items || []);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (keyword) doSearch(keyword);
  }, []);

  const handleSearch = () => {
    doSearch(keyword);
  };

  const goDetail = (id: string) => {
    Taro.navigateTo({ url: `/pages/product-detail/index?id=${id}` });
  };

  return (
    <View className="search-page">
      <View className="search-page__header">
        <Input
          className="search-page__input"
          value={keyword}
          placeholder="搜索商品"
          confirmType="search"
          onInput={(e) => setKeyword(e.detail.value)}
          onConfirm={handleSearch}
        />
        <Text className="search-page__btn" onClick={handleSearch}>搜索</Text>
      </View>

      {loading && <View className="search-page__loading">搜索中...</View>}

      {!loading && products.length === 0 && keyword && (
        <View className="search-page__empty">未找到相关商品</View>
      )}

      <View className="search-page__list">
        {products.map((p) => {
          const image = p.images?.[0] || '';
          const imageSrc = image.startsWith('http') ? image : `${BASE_URL}${image}`;
          return (
            <View key={p.id} className="search-page__item" onClick={() => goDetail(p.id)}>
              <Image className="search-page__item-img" src={imageSrc} mode="aspectFill" />
              <View className="search-page__item-info">
                <Text className="search-page__item-name">{p.name}</Text>
                <Text className="search-page__item-price">¥{Number(p.price).toFixed(2)}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}
