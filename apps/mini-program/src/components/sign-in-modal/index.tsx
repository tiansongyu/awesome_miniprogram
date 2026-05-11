import { View, Text } from '@tarojs/components';
import { useState } from 'react';
import './index.scss';

interface SignInModalProps {
  visible: boolean;
  points?: number;
  consecutiveDays?: number;
  onClose: () => void;
}

export default function SignInModal({ visible, points = 10, consecutiveDays = 1, onClose }: SignInModalProps) {
  if (!visible) return null;

  return (
    <View className="sign-in-modal" onClick={onClose}>
      <View className="sign-in-modal__content" onClick={(e) => e.stopPropagation()}>
        <View className="sign-in-modal__header">
          <Text className="sign-in-modal__title">签到成功</Text>
        </View>
        <View className="sign-in-modal__body">
          <View className="sign-in-modal__points-circle">
            <Text className="sign-in-modal__points-num">+{points}</Text>
            <Text className="sign-in-modal__points-label">积分</Text>
          </View>
          <Text className="sign-in-modal__days">
            连续签到 {consecutiveDays} 天
          </Text>
          <Text className="sign-in-modal__tip">
            连续签到天数越多，获得积分越多
          </Text>
        </View>
        <View className="sign-in-modal__footer" onClick={onClose}>
          <Text className="sign-in-modal__btn">知道了</Text>
        </View>
      </View>
    </View>
  );
}
