import { View, Text, Image, ScrollView } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { useState } from 'react';
import { request } from '../../utils/request';
import { useCartStore } from '../../store/cart';
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
  description: string;
  images: string[];
  category: { id: string; name: string };
  skus: Sku[];
}

function getSkuPrice(sku: Sku): number {
  const retail = sku.prices.find((p) => p.priceType === 'RETAIL');
  if (retail) return Number(retail.price);
  return Number(sku.prices[0]?.price ?? 0);
}

function getSpecKeys(skus: Sku[]): string[] {
  const keys = new Set<string>();
  for (const sku of skus) {
    Object.keys(sku.specs).forEach((k) => keys.add(k));
  }
  return Array.from(keys);
}

function getSpecValues(skus: Sku[], key: string): string[] {
  const vals = new Set<string>();
  for (const sku of skus) {
    if (sku.specs[key]) vals.add(sku.specs[key]);
  }
  return Array.from(vals);
}

function findSku(skus: Sku[], selected: Record<string, string>): Sku | null {
  return (
    skus.find((sku) =>
      Object.entries(selected).every(([k, v]) => sku.specs[k] === v)
    ) || null
  );
}

export default function ProductDetail() {
  const [product, setProduct] = useState<Product | null>(null);
  const [selectedSpecs, setSelectedSpecs] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);
  const [currentImage, setCurrentImage] = useState(0);
  const [loading, setLoading] = useState(false);
  const addItem = useCartStore((s) => s.addItem);

  useDidShow(() => {
    const params = Taro.getCurrentInstance().router?.params || {};
    const id = params.id as string;
    if (id) loadProduct(id);
  });

  async function loadProduct(id: string) {
    setLoading(true);
    try {
      const data = await request<Product>({ url: `/products/${id}` });
      setProduct(data);
      if (data.skus.length > 0) {
        const keys = getSpecKeys(data.skus);
        const initial: Record<string, string> = {};
        for (const key of keys) {
          const vals = getSpecValues(data.skus, key);
          if (vals.length > 0) initial[key] = vals[0];
        }
        setSelectedSpecs(initial);
      }
    } catch (_) {
    } finally {
      setLoading(false);
    }
  }

  function selectSpec(key: string, value: string) {
    setSelectedSpecs((prev) => ({ ...prev, [key]: value }));
  }

  function changeQuantity(delta: number) {
    setQuantity((prev) => Math.max(1, prev + delta));
  }

  function handleAddToCart() {
    if (!product) return;
    const sku = findSku(product.skus, selectedSpecs);
    if (!sku) {
      Taro.showToast({ title: '请选择规格', icon: 'none' });
      return;
    }
    if (sku.stock < quantity) {
      Taro.showToast({ title: '库存不足', icon: 'none' });
      return;
    }
    addItem({
      skuId: sku.id,
      productName: product.name,
      specs: sku.specs,
      price: getSkuPrice(sku),
      quantity,
      image: product.images?.[0] || '',
    });
    Taro.showToast({ title: '已加入购物车', icon: 'success' });
  }

  function handleBuyNow() {
    handleAddToCart();
    Taro.switchTab({ url: '/pages/cart/index' });
  }

  if (loading) {
    return (
      <View className="product-detail loading-page">
        <Text>加载中...</Text>
      </View>
    );
  }

  if (!product) {
    return (
      <View className="product-detail loading-page">
        <Text>商品不存在</Text>
      </View>
    );
  }

  const specKeys = getSpecKeys(product.skus);
  const selectedSku = findSku(product.skus, selectedSpecs);
  const displayPrice = selectedSku ? getSkuPrice(selectedSku) : null;

  return (
    <View className="product-detail">
      <ScrollView scrollY className="detail-scroll">
        {/* Image swiper */}
        <View className="image-swiper">
          {product.images.length > 0 ? (
            <>
              <Image
                className="main-image"
                src={product.images[currentImage]}
                mode="aspectFill"
              />
              {product.images.length > 1 && (
                <View className="image-dots">
                  {product.images.map((_, i) => (
                    <View
                      key={i}
                      className={`dot ${i === currentImage ? 'active' : ''}`}
                      onClick={() => setCurrentImage(i)}
                    />
                  ))}
                </View>
              )}
            </>
          ) : (
            <View className="image-placeholder" />
          )}
        </View>

        {/* Price and name */}
        <View className="product-header">
          <View className="price-row">
            <Text className="price">
              {displayPrice !== null ? `¥${displayPrice.toFixed(2)}` : '--'}
            </Text>
            {selectedSku && (
              <Text className="stock">库存: {selectedSku.stock}</Text>
            )}
          </View>
          <Text className="product-name">{product.name}</Text>
          {product.description ? (
            <Text className="product-desc">{product.description}</Text>
          ) : null}
        </View>

        {/* SKU selector */}
        {specKeys.length > 0 && (
          <View className="sku-section">
            <Text className="sku-title">选择规格</Text>
            {specKeys.map((key) => (
              <View key={key} className="spec-group">
                <Text className="spec-key">{key}</Text>
                <View className="spec-values">
                  {getSpecValues(product.skus, key).map((val) => (
                    <View
                      key={val}
                      className={`spec-tag ${selectedSpecs[key] === val ? 'selected' : ''}`}
                      onClick={() => selectSpec(key, val)}
                    >
                      <Text>{val}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Quantity selector */}
        <View className="quantity-section">
          <Text className="quantity-label">数量</Text>
          <View className="quantity-control">
            <View
              className={`qty-btn ${quantity <= 1 ? 'disabled' : ''}`}
              onClick={() => changeQuantity(-1)}
            >
              <Text>-</Text>
            </View>
            <Text className="qty-value">{quantity}</Text>
            <View className="qty-btn" onClick={() => changeQuantity(1)}>
              <Text>+</Text>
            </View>
          </View>
        </View>

        {/* Description spacer so bottom bar doesn't cover content */}
        <View className="bottom-spacer" />
      </ScrollView>

      {/* Bottom action bar */}
      <View className="action-bar">
        <View className="btn-cart" onClick={handleAddToCart}>
          <Text>加入购物车</Text>
        </View>
        <View className="btn-buy" onClick={handleBuyNow}>
          <Text>立即购买</Text>
        </View>
      </View>
    </View>
  );
}
