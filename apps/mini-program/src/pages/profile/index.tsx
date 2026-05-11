import { View, Text, Image, Button, Input } from '@tarojs/components';
import Taro, { useDidShow, useRouter } from '@tarojs/taro';
import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/auth';
import { request } from '../../utils/request';
import SignInModal from '../../components/sign-in-modal';
import './index.scss';

const MEMBER_LEVEL_MAP: Record<string, { label: string; cls: string }> = {
  GOLD: { label: '金会员', cls: 'badge--gold' },
  SILVER: { label: '银会员', cls: 'badge--silver' },
  BRONZE: { label: '铜会员', cls: 'badge--bronze' },
};

const ROLE_LABEL_MAP: Record<string, string> = {
  AGENT_L1: '一级代理',
  AGENT_L2: '二级代理',
  AGENT_L3: '三级代理',
};

export default function Profile() {
  const { user, isLoggedIn, login, phoneLogin, register, fetchProfile, logout } = useAuthStore();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [signInModalVisible, setSignInModalVisible] = useState(false);
  const [signInPoints, setSignInPoints] = useState(10);
  const [consecutiveDays, setConsecutiveDays] = useState(0);
  const [signedToday, setSignedToday] = useState(false);
  const [totalPoints, setTotalPoints] = useState(0);
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);

  const router = useRouter();

  useEffect(() => {
    const code = router.params?.inviteCode;
    if (code) {
      setInviteCode(code);
      setIsRegisterMode(true);
    }
  }, [router.params]);

  useDidShow(() => {
    if (isLoggedIn && !user) {
      fetchProfile().catch(() => {});
    }
    if (isLoggedIn) {
      fetchSignInStatus();
      fetchUnreadMsgCount();
    }
  });

  const fetchSignInStatus = async () => {
    try {
      const res = await request<{ signedToday: boolean; consecutiveDays: number; totalPoints: number }>({
        url: '/sign-in/status',
      });
      setSignedToday(res.signedToday);
      setConsecutiveDays(res.consecutiveDays);
      setTotalPoints(res.totalPoints);
    } catch (e) {
      // ignore
    }
  };

  const fetchUnreadMsgCount = async () => {
    try {
      const res = await request<{ count: number }>({
        url: '/messages/unread-count',
      });
      setUnreadMsgCount(res.count);
    } catch (e) {
      // ignore
    }
  };

  const handleSignIn = async () => {
    if (signedToday) {
      Taro.showToast({ title: '今日已签到', icon: 'none' });
      return;
    }
    try {
      const res = await request<{ points: number; consecutiveDays: number }>({
        url: '/sign-in',
        method: 'POST',
      });
      setSignInPoints(res.points);
      setConsecutiveDays(res.consecutiveDays);
      setSignedToday(true);
      setTotalPoints((prev) => prev + res.points);
      setSignInModalVisible(true);
    } catch (e: any) {
      Taro.showToast({ title: e?.message || '签到失败', icon: 'none' });
    }
  };

  const handlePhoneLogin = async () => {
    if (!phone || !password) {
      Taro.showToast({ title: '请输入手机号和密码', icon: 'none' });
      return;
    }
    if (password.length < 6) {
      Taro.showToast({ title: '密码至少6位', icon: 'none' });
      return;
    }
    setLoading(true);
    try {
      await phoneLogin(phone, password);
      await fetchProfile();
      Taro.showToast({ title: '登录成功', icon: 'success' });
    } catch (e: any) {
      Taro.showToast({ title: e?.message || '登录失败，请重试', icon: 'none' });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!phone || !password) {
      Taro.showToast({ title: '请输入手机号和密码', icon: 'none' });
      return;
    }
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      Taro.showToast({ title: '手机号格式不正确', icon: 'none' });
      return;
    }
    if (password.length < 6) {
      Taro.showToast({ title: '密码至少6位', icon: 'none' });
      return;
    }
    if (password !== confirmPassword) {
      Taro.showToast({ title: '两次密码不一致', icon: 'none' });
      return;
    }
    setLoading(true);
    try {
      await register(phone, password, nickname || undefined, inviteCode || undefined);
      await fetchProfile();
      Taro.showToast({ title: '注册成功', icon: 'success' });
    } catch (e: any) {
      Taro.showToast({ title: e?.message || '注册失败，请重试', icon: 'none' });
    } finally {
      setLoading(false);
    }
  };

  const handleWechatLogin = async () => {
    try {
      const { code } = await Taro.login();
      await login(code);
      await fetchProfile();
    } catch (e) {
      Taro.showToast({ title: '登录失败，请重试', icon: 'none' });
    }
  };

  const handleLogout = () => {
    Taro.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          logout();
        }
      },
    });
  };

  const navigateTo = (url: string) => {
    Taro.navigateTo({ url });
  };

  const memberInfo = user?.memberLevel ? MEMBER_LEVEL_MAP[user.memberLevel] : null;
  const roleLabel = user?.role ? ROLE_LABEL_MAP[user.role] : null;
  const isAgent = user?.role?.startsWith('AGENT_');

  return (
    <View className="profile">
      {/* User info card */}
      <View className="profile__card">
        {isLoggedIn && user ? (
          <View className="profile__user">
            <Image
              className="profile__avatar"
              src={user.avatar || 'https://via.placeholder.com/80'}
              mode="aspectFill"
            />
            <View className="profile__info">
              <Text className="profile__nickname">{user.nickname || '用户'}</Text>
              <View className="profile__meta">
                {memberInfo && (
                  <Text className={`profile__badge ${memberInfo.cls}`}>{memberInfo.label}</Text>
                )}
                {roleLabel && (
                  <Text className="profile__role">{roleLabel}</Text>
                )}
              </View>
            </View>
          </View>
        ) : (
          <View className="profile__guest">
            <View className="profile__login-form">
              <Input
                className="profile__input"
                type="number"
                placeholder="请输入手机号"
                maxlength={11}
                value={phone}
                onInput={(e) => setPhone(e.detail.value)}
              />
              <Input
                className="profile__input"
                password
                placeholder="请输入密码"
                maxlength={20}
                value={password}
                onInput={(e) => setPassword(e.detail.value)}
              />
              {isRegisterMode && (
                <>
                  <Input
                    className="profile__input"
                    password
                    placeholder="请确认密码"
                    maxlength={20}
                    value={confirmPassword}
                    onInput={(e) => setConfirmPassword(e.detail.value)}
                  />
                  <Input
                    className="profile__input"
                    placeholder="昵称（可选）"
                    maxlength={20}
                    value={nickname}
                    onInput={(e) => setNickname(e.detail.value)}
                  />
                  <Input
                    className="profile__input"
                    placeholder="邀请码（可选）"
                    maxlength={20}
                    value={inviteCode}
                    onInput={(e) => setInviteCode(e.detail.value)}
                  />
                </>
              )}
              {isRegisterMode ? (
                <Button
                  className="profile__login-btn profile__login-btn--primary"
                  onClick={handleRegister}
                  disabled={loading}
                >
                  {loading ? '注册中...' : '注册'}
                </Button>
              ) : (
                <>
                  <Button
                    className="profile__login-btn profile__login-btn--primary"
                    onClick={handlePhoneLogin}
                    disabled={loading}
                  >
                    {loading ? '登录中...' : '手机号登录'}
                  </Button>
                  <Button
                    className="profile__login-btn profile__login-btn--wechat"
                    onClick={handleWechatLogin}
                  >
                    微信快捷登录
                  </Button>
                </>
              )}
              <View className="profile__switch-mode" onClick={() => setIsRegisterMode(!isRegisterMode)}>
                <Text className="profile__switch-text">
                  {isRegisterMode ? '已有账号？去登录' : '没有账号？去注册'}
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* Menu list */}
      <View className="profile__menu">
        <View
          className="profile__menu-item"
          onClick={() => navigateTo('/pages/order-list/index')}
        >
          <Text className="profile__menu-icon">📦</Text>
          <Text className="profile__menu-label">我的订单</Text>
          <Text className="profile__menu-arrow">›</Text>
        </View>

        <View
          className="profile__menu-item"
          onClick={() => navigateTo('/pages/coupons/index')}
        >
          <Text className="profile__menu-icon">🎫</Text>
          <Text className="profile__menu-label">我的优惠券</Text>
          <Text className="profile__menu-arrow">›</Text>
        </View>

        <View
          className="profile__menu-item"
          onClick={() => navigateTo('/pages/address/index')}
        >
          <Text className="profile__menu-icon">📍</Text>
          <Text className="profile__menu-label">收货地址</Text>
          <Text className="profile__menu-arrow">›</Text>
        </View>

        {isAgent && (
          <View
            className="profile__menu-item profile__menu-item--agent"
            onClick={() => navigateTo('/pages/agent-center/index')}
          >
            <Text className="profile__menu-icon">🔥</Text>
            <Text className="profile__menu-label">代理中心</Text>
            <Text className="profile__menu-arrow">›</Text>
          </View>
        )}

        <View className="profile__menu-item" onClick={handleSignIn}>
          <Text className="profile__menu-icon">📅</Text>
          <Text className="profile__menu-label">每日签到</Text>
          {signedToday ? (
            <Text className="profile__menu-value">已签到</Text>
          ) : (
            <Text className="profile__menu-value">去签到</Text>
          )}
          <Text className="profile__menu-arrow">›</Text>
        </View>

        <View className="profile__menu-item profile__menu-item--value">
          <Text className="profile__menu-icon">🎯</Text>
          <Text className="profile__menu-label">我的积分</Text>
          <Text className="profile__menu-value">
            {totalPoints}
          </Text>
        </View>

        <View className="profile__menu-item profile__menu-item--value">
          <Text className="profile__menu-icon">💰</Text>
          <Text className="profile__menu-label">我的余额</Text>
          <Text className="profile__menu-value">
            ¥{user?.balance ?? '--'}
          </Text>
        </View>

        <View className="profile__menu-item profile__menu-item--value">
          <Text className="profile__menu-icon">⭐</Text>
          <Text className="profile__menu-label">会员等级</Text>
          <Text className="profile__menu-value">
            {memberInfo ? memberInfo.label : '--'}
          </Text>
        </View>

        <View className="profile__menu-item" onClick={() => Taro.navigateTo({ url: '/pages/messages/index' })}>
          <Text className="profile__menu-icon">🔔</Text>
          <Text className="profile__menu-label">消息通知</Text>
          {unreadMsgCount > 0 && (
            <Text className="profile__menu-badge">{unreadMsgCount > 99 ? '99+' : unreadMsgCount}</Text>
          )}
          <Text className="profile__menu-arrow">›</Text>
        </View>

        <View className="profile__menu-item" onClick={() => Taro.navigateTo({ url: '/pages/favorites/index' })}>
          <Text className="profile__menu-icon">❤️</Text>
          <Text className="profile__menu-label">我的收藏</Text>
          <Text className="profile__menu-arrow">›</Text>
        </View>

        <View className="profile__menu-item">
          <Text className="profile__menu-icon">⚙️</Text>
          <Text className="profile__menu-label">设置</Text>
          <Text className="profile__menu-arrow">›</Text>
        </View>
      </View>

      {isLoggedIn && (
        <View className="profile__logout" onClick={handleLogout}>
          <Text className="profile__logout-text">退出登录</Text>
        </View>
      )}

      <SignInModal
        visible={signInModalVisible}
        points={signInPoints}
        consecutiveDays={consecutiveDays}
        onClose={() => setSignInModalVisible(false)}
      />
    </View>
  );
}
