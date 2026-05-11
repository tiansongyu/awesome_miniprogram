import { View, Text, Textarea } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useState } from 'react';
import { request } from '../../utils/request';
import './index.scss';

const REASON_OPTIONS = [
  '商品质量问题',
  '发错货/漏发',
  '商品与描述不符',
  '不想要了',
  '其他原因',
];

export default function RefundPage() {
  const { orderId, amount } = Taro.getCurrentInstance().router?.params || {};
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const finalReason = selectedReason === '其他原因' ? customReason : selectedReason;

  const handleSubmit = async () => {
    if (!finalReason.trim()) {
      Taro.showToast({ title: '请选择或填写退款原因', icon: 'none' });
      return;
    }
    if (submitting) return;

    setSubmitting(true);
    try {
      await request({
        url: '/refunds',
        method: 'POST',
        data: { orderId, reason: finalReason },
      });
      Taro.showToast({ title: '退款申请已提交', icon: 'success' });
      setTimeout(() => {
        Taro.navigateBack();
      }, 1500);
    } catch (err: any) {
      Taro.showToast({ title: err?.message || '提交失败', icon: 'none' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View className="refund-page">
      {/* 退款金额 */}
      <View className="refund-page__section">
        <Text className="refund-page__label">退款金额</Text>
        <Text className="refund-page__amount">¥{amount || '0.00'}</Text>
      </View>

      {/* 退款原因 */}
      <View className="refund-page__section">
        <Text className="refund-page__label">退款原因</Text>
        <View className="refund-page__reasons">
          {REASON_OPTIONS.map((reason) => (
            <View
              key={reason}
              className={`refund-page__reason-item ${selectedReason === reason ? 'refund-page__reason-item--active' : ''}`}
              onClick={() => setSelectedReason(reason)}
            >
              <Text>{reason}</Text>
            </View>
          ))}
        </View>

        {selectedReason === '其他原因' && (
          <Textarea
            className="refund-page__textarea"
            placeholder="请输入退款原因"
            value={customReason}
            onInput={(e) => setCustomReason(e.detail.value)}
            maxlength={200}
          />
        )}
      </View>

      {/* 提交按钮 */}
      <View
        className={`refund-page__submit ${!finalReason.trim() || submitting ? 'refund-page__submit--disabled' : ''}`}
        onClick={handleSubmit}
      >
        <Text className="refund-page__submit-text">
          {submitting ? '提交中...' : '提交退款申请'}
        </Text>
      </View>
    </View>
  );
}
