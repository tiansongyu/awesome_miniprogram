import { createBrowserRouter, Navigate } from 'react-router-dom';
import AdminLayout from '../layouts/AdminLayout';
import Login from '../pages/login';
import Dashboard from '../pages/dashboard';
import Products from '../pages/products';
import Categories from '../pages/categories';
import Orders from '../pages/orders';
import Agents from '../pages/agents';
import Members from '../pages/members';
import Users from '../pages/users';
import Settlements from '../pages/settlements';
import Pricing from '../pages/pricing';
import Coupons from '../pages/coupons';
import Refunds from '../pages/refunds';
import Settings from '../pages/settings';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('accessToken');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/',
    element: (
      <RequireAuth>
        <AdminLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <Dashboard /> },
      { path: 'products', element: <Products /> },
      { path: 'categories', element: <Categories /> },
      { path: 'orders', element: <Orders /> },
      { path: 'agents', element: <Agents /> },
      { path: 'members', element: <Members /> },
      { path: 'users', element: <Users /> },
      { path: 'settlements', element: <Settlements /> },
      { path: 'pricing', element: <Pricing /> },
      { path: 'coupons', element: <Coupons /> },
      { path: 'refunds', element: <Refunds /> },
      { path: 'settings', element: <Settings /> },
    ],
  },
]);

export default router;
