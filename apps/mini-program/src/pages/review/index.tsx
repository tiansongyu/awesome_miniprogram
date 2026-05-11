import { View, Text, Textarea, Image } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { useState } from 'react';
import { request, BASE_URL } from '../../utils/request';
import './index.scss';

export default function ReviewPage() {
  const router = useRouter();
  const { orderId, productId, productName } = router.params;

  const [rating, setRating] = useState(5);
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const handleChooseImage = () => {
    if (images.length >= 3) {
      Taro.showToast({ title: '最多上传3张图片', icon: 'none' });
      return;
    }
    Taro.chooseImage({
      count: 3 - images.length,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFiles = res.tempFilePaths;
        const uploadPromises = tempFiles.map(
          (filePath) =>
            new Promise<string>((resolve, reject) => {
              Taro.uploadFile({
                url: `${BASE_URL}/upload/image`,
                filePath,
                name: 'file',
                header: {
                  Authorization: `Bearer ${Taro.getStorageSync('token')}`,
                },
                success: (uploadRes) => {
                  try {
                    const data = JSON.parse(uploadRes.data);
                    resolve(data.data?.url || data.url || '');
                  } catch {
                    reject(new Error('上传失败'));
                  }
                },
                fail: () => reject(new Error('上传失败')),
              });
            })
        );
        Promise.all(uploadPromises).then((urls) => {
          setImages((prev) => [...prev, ...urls].slice(0, 3));
        }).catch(() => {
          Taro.showToast({ title: '图片上传失败', icon: 'none' });
        });
      },
    });
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!content.trim()) {
      Taro.showToast({ title: '请输入评价内容', icon: 'none' });
      return;
    }
    setSubmitting(true);
    try {
      const data: any = {
        orderId,
        rating,
        content: content.trim(),
        images,
      };
      if (productId) data.productId = productId;
      await request({
        url: '/reviews',
        method: 'POST',
        data,
      });
      Taro.showToast({ title: '评价成功', icon: 'success' });
      setTimeout(() => {
        Taro.navigateBack();
      }, 1500);
    } catch {
      // error handled by request util
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View className="review-page">
      <View className="review-page__product">
        <Text className="review-page__product-name">{decodeURIComponent(productName || '')}</Text>
      </View>

      {/* Star Rating */}
      <View className="review-page__section">
        <Text className="review-page__label">评分</Text>
        <View className="review-page__stars">
          {[1, 2, 3, 4, 5].map((star) => (
            <Text
              key={star}
              className={`review-page__star ${star <= rating ? 'review-page__star--active' : ''}`}
              onClick={() => setRating(star)}
            >
              ★
            </Text>
          ))}
        </View>
      </View>

      {/* Content */}
      <View className="review-page__section">
        <Text className="review-page__label">评价内容</Text>
        <Textarea
          className="review-page__textarea"
          placeholder="请分享您的使用体验..."
          value={content}
          onInput={(e) => setContent(e.detail.value)}
          maxlength={500}
        />
      </View>

      {/* Image Upload */}
      <View className="review-page__section">
        <Text className="review-page__label">上传图片（最多3张）</Text>
        <View className="review-page__images">
          {images.map((img, index) => (
            <View key={index} className="review-page__image-wrap">
              <Image className="review-page__image" src={img.startsWith('http') ? img : `${BASE_URL}${img}`} mode="aspectFill" />
              <Text className="review-page__image-remove" onClick={() => handleRemoveImage(index)}>×</Text>
            </View>
          ))}
          {images.length < 3 && (
            <View className="review-page__image-add" onClick={handleChooseImage}>
              <Text className="review-page__image-add-icon">+</Text>
            </View>
          )}
        </View>
      </View>

      {/* Submit */}
      <View
        className={`review-page__submit ${submitting ? 'review-page__submit--disabled' : ''}`}
        onClick={submitting ? undefined : handleSubmit}
      >
        <Text>{submitting ? '提交中...' : '提交评价'}</Text>
      </View>
    </View>
  );
}
