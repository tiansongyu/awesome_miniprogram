import { useState } from 'react';
import { View, Text, Input } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { request } from '../../utils/request';
import { useAuthStore } from '../../store/auth';
import './index.scss';

export default function SettingsPage() {
  const { user, fetchProfile } = useAuthStore();
  const [nickname, setNickname] = useState(user?.nickname || '');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSaveNickname = async () => {
    if (!nickname.trim()) {
      Taro.showToast({ title: '请输入昵称', icon: 'none' });
      return;
    }
    try {
      await request({
        url: '/users/profile',
        method: 'PUT',
        data: { nickname },
      });
      Taro.showToast({ title: '昵称修改成功', icon: 'success' });
      fetchProfile();
    } catch (e) {
      Taro.showToast({ title: '修改失败', icon: 'none' });
    }
  };

  const handleChangePassword = async () => {
    if (!oldPassword) {
      Taro.showToast({ title: '请输入旧密码', icon: 'none' });
      return;
    }
    if (!newPassword) {
      Taro.showToast({ title: '请输入新密码', icon: 'none' });
      return;
    }
    if (newPassword !== confirmPassword) {
      Taro.showToast({ title: '两次密码不一致', icon: 'none' });
      return;
    }
    try {
      await request({
        url: '/users/profile',
        method: 'PUT',
        data: { oldPassword, newPassword },
      });
      Taro.showToast({ title: '密码修改成功', icon: 'success' });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e) {
      Taro.showToast({ title: '修改失败', icon: 'none' });
    }
  };

  return (
    <View className="settings-page">
      <View className="settings-section">
        <Text className="section-title">修改昵称</Text>
        <View className="form-item">
          <Input
            className="form-input"
            placeholder="请输入新昵称"
            value={nickname}
            onInput={(e) => setNickname(e.detail.value)}
          />
        </View>
        <View className="save-btn" onClick={handleSaveNickname}>
          <Text className="save-btn-text">保存昵称</Text>
        </View>
      </View>

      <View className="settings-section">
        <Text className="section-title">修改密码</Text>
        <View className="form-item">
          <Input
            className="form-input"
            placeholder="请输入旧密码"
            password
            value={oldPassword}
            onInput={(e) => setOldPassword(e.detail.value)}
          />
        </View>
        <View className="form-item">
          <Input
            className="form-input"
            placeholder="请输入新密码"
            password
            value={newPassword}
            onInput={(e) => setNewPassword(e.detail.value)}
          />
        </View>
        <View className="form-item">
          <Input
            className="form-input"
            placeholder="请确认新密码"
            password
            value={confirmPassword}
            onInput={(e) => setConfirmPassword(e.detail.value)}
          />
        </View>
        <View className="save-btn" onClick={handleChangePassword}>
          <Text className="save-btn-text">修改密码</Text>
        </View>
      </View>

      <View className="settings-section">
        <Text className="section-title">关于我们</Text>
        <View className="about-item">
          <Text className="about-label">版本号</Text>
          <Text className="about-value">v1.0.0</Text>
        </View>
        <View className="about-item">
          <Text className="about-label">客服电话</Text>
          <Text className="about-value">400-888-8888</Text>
        </View>
        <View className="about-item">
          <Text className="about-label">公司名称</Text>
          <Text className="about-value">代购助手科技有限公司</Text>
        </View>
      </View>
    </View>
  );
}
