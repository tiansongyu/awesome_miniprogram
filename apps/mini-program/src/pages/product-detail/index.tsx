import { View, Text, Image, ScrollView, RichText, Button } from '@tarojs/components';
import Taro, { useDidShow, useShareAppMessage } from '@tarojs/taro';
import { useState } from 'react';
import { request, BASE_URL } from '../../utils/request';
import { useCartStore } from '../../store/cart';
import './index.scss';

function fullUrl(url: string) {
  if (!url) return '';
  return url.startsWith('http') ? url : `${BASE_URL}${url}`;
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
  description: string;
  detail?: string;
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
  const [showSharePanel, setShowSharePanel] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const addItem = useCartStore((s) => s.addItem);

  useShareAppMessage(() => ({
    title: product?.name || '好物推荐',
    path: `/pages/product-detail/index?id=${product?.id}`,
    imageUrl: product?.images?.[0] ? fullUrl(product.images[0]) : '',
  }));

  useDidShow(() => {
    const params = Taro.getCurrentInstance().router?.params || {};
    const id = params.id as string;
    if (id) {
      loadProduct(id);
      loadFavoriteStatus(id);
      loadReviews(id);
    }
  });

  async function loadFavoriteStatus(id: string) {
    try {
      const res = await request<{ favorited: boolean }>({ url: `/favorites/${id}/status` });
      setFavorited(res.favorited);
    } catch (_) {}
  }

  async function loadReviews(id: string) {
    try {
      const res = await request<{ items: any[] }>({ url: `/reviews/product/${id}?pageSize=5` });
      setReviews(res.items || []);
    } catch (_) {}
  }

  async function handleToggleFavorite() {
    if (!product) return;
    try {
      const res = await request<{ favorited: boolean }>({
        url: `/favorites/${product.id}`,
        method: 'POST',
      });
      setFavorited(res.favorited);
      Taro.showToast({ title: res.favorited ? '已收藏' : '已取消收藏', icon: 'none' });
    } catch (_) {}
  }

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
                src={fullUrl(product.images[currentImage])}
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

        {/* Product detail rich text */}
        {product.detail && (
          <View className="detail-section">
            <View className="detail-title">
              <Text>商品详情</Text>
            </View>
            <RichText nodes={product.detail} />
          </View>
        )}

        {/* User reviews */}
        <View className="detail-section">
          <View className="detail-title">
            <Text>用户评价 ({reviews.length})</Text>
          </View>
          {reviews.length === 0 ? (
            <View className="review-empty">
              <Text className="review-empty__text">暂无评价</Text>
            </View>
          ) : (
            reviews.map((review) => (
              <View key={review.id} className="review-item">
                <View className="review-item__header">
                  <Text className="review-item__user">{review.user?.nickname || '匿名用户'}</Text>
                  <Text className="review-item__rating">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</Text>
                </View>
                {review.content && (
                  <Text className="review-item__content">{review.content}</Text>
                )}
                {review.images && review.images.length > 0 && (
                  <View className="review-item__images">
                    {review.images.map((img: string, idx: number) => (
                      <Image key={idx} className="review-item__image" src={fullUrl(img)} mode="aspectFill" />
                    ))}
                  </View>
                )}
                <Text className="review-item__time">{review.createdAt?.slice(0, 10)}</Text>
              </View>
            ))
          )}
        </View>

        {/* Description spacer so bottom bar doesn't cover content */}
        <View className="bottom-spacer" />
      </ScrollView>

      {/* Bottom action bar */}
      <View className="action-bar">
        <View className={`btn-favorite ${favorited ? 'active' : ''}`} onClick={handleToggleFavorite}>
          <Text className="btn-favorite__icon">{favorited ? '❤' : '♡'}</Text>
          <Text className="btn-favorite__text">{favorited ? '已收藏' : '收藏'}</Text>
        </View>
        <View className="btn-share" onClick={() => setShowSharePanel(true)}>
          <Text>分享</Text>
        </View>
        <View className="btn-cart" onClick={handleAddToCart}>
          <Text>加入购物车</Text>
        </View>
        <View className="btn-buy" onClick={handleBuyNow}>
          <Text>立即购买</Text>
        </View>
      </View>

      {/* Share panel */}
      {showSharePanel && (
        <View className="share-mask" onClick={() => setShowSharePanel(false)}>
          <View className="share-panel" onClick={(e) => e.stopPropagation()}>
            <Text className="share-panel__title">分享商品</Text>
            <View className="share-panel__options">
              <Button className="share-panel__btn share-panel__btn--wechat" openType="share" onClick={() => setShowSharePanel(false)}>
                <View className="share-panel__icon share-panel__icon--wechat">
                  <Text>微</Text>
                </View>
                <Text className="share-panel__label">分享给好友</Text>
              </Button>
              <View
                className="share-panel__btn"
                onClick={() => {
                  Taro.setClipboardData({
                    data: `${product?.name} - 快来看看这个好物！`,
                    success: () => {
                      Taro.showToast({ title: '已复制', icon: 'success' });
                      setShowSharePanel(false);
                    },
                  });
                }}
              >
                <View className="share-panel__icon share-panel__icon--link">
                  <Text>链</Text>
                </View>
                <Text className="share-panel__label">复制链接</Text>
              </View>
            </View>
            <View className="share-panel__cancel" onClick={() => setShowSharePanel(false)}>
              <Text>取消</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
