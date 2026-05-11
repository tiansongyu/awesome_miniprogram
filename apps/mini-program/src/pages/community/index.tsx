import { View, Text, Image, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useState, useEffect } from 'react';
import { request, BASE_URL } from '../../utils/request';
import './index.scss';

interface Post {
  id: string;
  content: string;
  rating: number;
  images: string[];
  createdAt: string;
  user: { id: string; nickname: string; avatar: string };
  product: { id: string; name: string; images: string[] };
}

export default function CommunityPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPosts(1, true);
  }, []);

  async function loadPosts(pageNum: number, replace = false) {
    if (loading) return;
    setLoading(true);
    try {
      const data = await request<{ items: Post[]; total: number }>({
        url: `/community/posts?page=${pageNum}&pageSize=20`,
      });
      setTotal(data.total);
      setPosts((prev) => (replace ? data.items : [...prev, ...data.items]));
      setPage(pageNum);
    } catch (_) {
    } finally {
      setLoading(false);
    }
  }

  function handleScrollToLower() {
    if (posts.length < total && !loading) {
      loadPosts(page + 1);
    }
  }

  function goToProduct(id: string) {
    Taro.navigateTo({ url: `/pages/product-detail/index?id=${id}` });
  }

  function getImageSrc(img: string) {
    return img.startsWith('http') ? img : `${BASE_URL}${img}`;
  }

  return (
    <View className="community-page">
      <ScrollView scrollY className="scroll-area" onScrollToLower={handleScrollToLower} lowerThreshold={100}>
        <View className="post-list">
          {posts.map((post) => (
            <View key={post.id} className="post-card">
              <View className="post-header">
                {post.user.avatar ? (
                  <Image className="user-avatar" src={post.user.avatar} />
                ) : (
                  <View className="user-avatar-placeholder" />
                )}
                <View className="user-info">
                  <Text className="user-name">{post.user.nickname || '用户'}</Text>
                  <Text className="post-time">{post.createdAt?.slice(0, 10)}</Text>
                </View>
                <View className="post-rating">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Text key={i} className={`star ${i < post.rating ? 'active' : ''}`}>★</Text>
                  ))}
                </View>
              </View>
              <Text className="post-content">{post.content}</Text>
              {post.images.length > 0 && (
                <View className="post-images">
                  {post.images.slice(0, 9).map((img, idx) => (
                    <Image
                      key={idx}
                      className="post-image"
                      src={getImageSrc(img)}
                      mode="aspectFill"
                      onClick={() => {
                        Taro.previewImage({
                          current: getImageSrc(img),
                          urls: post.images.map(getImageSrc),
                        });
                      }}
                    />
                  ))}
                </View>
              )}
              {post.product && (
                <View className="post-product" onClick={() => goToProduct(post.product.id)}>
                  {post.product.images?.[0] && (
                    <Image className="product-thumb" src={getImageSrc(post.product.images[0])} mode="aspectFill" />
                  )}
                  <Text className="product-name">{post.product.name}</Text>
                  <Text className="product-arrow">›</Text>
                </View>
              )}
            </View>
          ))}
        </View>
        {loading && <View className="loading-tip"><Text>加载中...</Text></View>}
        {!loading && posts.length >= total && posts.length > 0 && (
          <View className="end-tip"><Text>已加载全部</Text></View>
        )}
        {!loading && posts.length === 0 && (
          <View className="empty-tip"><Text>暂无买家秀</Text></View>
        )}
      </ScrollView>
    </View>
  );
}
