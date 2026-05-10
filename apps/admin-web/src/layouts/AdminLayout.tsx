import {
  AppstoreOutlined,
  BarChartOutlined,
  DollarOutlined,
  LogoutOutlined,
  OrderedListOutlined,
  SettingOutlined,
  ShoppingOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { ProLayout } from '@ant-design/pro-components';
import { Dropdown } from 'antd';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';

const menuItems = [
  { path: '/dashboard', name: '数据概览', icon: <BarChartOutlined /> },
  { path: '/products', name: '商品管理', icon: <ShoppingOutlined /> },
  { path: '/categories', name: '分类管理', icon: <AppstoreOutlined /> },
  { path: '/orders', name: '订单管理', icon: <OrderedListOutlined /> },
  { path: '/agents', name: '代理管理', icon: <TeamOutlined /> },
  { path: '/members', name: '会员管理', icon: <UserOutlined /> },
  { path: '/settlements', name: '结算中心', icon: <DollarOutlined /> },
  { path: '/pricing', name: '定价管理', icon: <DollarOutlined /> },
  { path: '/settings', name: '系统设置', icon: <SettingOutlined /> },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <ProLayout
      title="管理后台"
      logo={null}
      location={{ pathname: location.pathname }}
      menuItemRender={(item, dom) => (
        <div onClick={() => item.path && navigate(item.path)}>{dom}</div>
      )}
      route={{
        path: '/',
        routes: menuItems,
      }}
      avatarProps={{
        src: undefined,
        title: user?.phone ?? '管理员',
        render: (_props, dom) => (
          <Dropdown
            menu={{
              items: [
                {
                  key: 'logout',
                  icon: <LogoutOutlined />,
                  label: '退出登录',
                  onClick: handleLogout,
                },
              ],
            }}
          >
            {dom}
          </Dropdown>
        ),
      }}
      style={{ minHeight: '100vh' }}
    >
      <Outlet />
    </ProLayout>
  );
}
