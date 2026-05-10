import { View, Text, Image, Button } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { useAuthStore } from '../../store/auth';
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
  const { user, isLoggedIn, login, fetchProfile, logout } = useAuthStore();

  useDidShow(() => {
    if (isLoggedIn && !user) {
      fetchProfile().catch(() => {});
    }
  });

  const handleLogin = async () => {
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
            <View className="profile__avatar profile__avatar--placeholder" />
            <Button className="profile__login-btn" onClick={handleLogin}>
              点击登录
            </Button>
          </View>
        )}
      </View>

      {/* Menu list */}
      <View className="profile__menu">
        <View
          className="profile__menu-item"
          onClick={() => navigateTo('/pages/order-list/index')}
        >
          <Text className="profile__menu-label">我的订单</Text>
          <Text className="profile__menu-arrow">›</Text>
        </View>

        {isAgent && (
          <View
            className="profile__menu-item"
            onClick={() => navigateTo('/pages/agent-center/index')}
          >
            <Text className="profile__menu-label">代理中心</Text>
            <Text className="profile__menu-arrow">›</Text>
          </View>
        )}

        <View className="profile__menu-item profile__menu-item--value">
          <Text className="profile__menu-label">我的余额</Text>
          <Text className="profile__menu-value">
            ¥{user?.balance ?? '--'}
          </Text>
        </View>

        <View className="profile__menu-item profile__menu-item--value">
          <Text className="profile__menu-label">会员等级</Text>
          <Text className="profile__menu-value">
            {memberInfo ? memberInfo.label : '--'}
          </Text>
        </View>

        <View className="profile__menu-item">
          <Text className="profile__menu-label">设置</Text>
          <Text className="profile__menu-arrow">›</Text>
        </View>
      </View>

      {isLoggedIn && (
        <View className="profile__logout" onClick={handleLogout}>
          <Text className="profile__logout-text">退出登录</Text>
        </View>
      )}
    </View>
  );
}
