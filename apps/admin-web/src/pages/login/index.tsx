import { LockOutlined, MobileOutlined } from '@ant-design/icons';
import { LoginForm, ProFormText } from '@ant-design/pro-components';
import { message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth';

export default function Login() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);

  const handleSubmit = async (values: { phone: string; password: string }) => {
    try {
      await login(values.phone, values.password);
      message.success('登录成功');
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '登录失败，请检查账号密码';
      message.error(msg);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f0f2f5',
      }}
    >
      <div style={{ width: 400 }}>
        <LoginForm
          title="管理后台"
          subTitle="代理销售系统"
          onFinish={handleSubmit}
          submitter={{ searchConfig: { submitText: '登录' } }}
        >
          <ProFormText
            name="phone"
            fieldProps={{ prefix: <MobileOutlined /> }}
            placeholder="请输入手机号"
            rules={[
              { required: true, message: '请输入手机号' },
              { pattern: /^1\d{10}$/, message: '请输入正确的手机号' },
            ]}
          />
          <ProFormText.Password
            name="password"
            fieldProps={{ prefix: <LockOutlined /> }}
            placeholder="请输入密码"
            rules={[{ required: true, message: '请输入密码' }]}
          />
        </LoginForm>
      </div>
    </div>
  );
}
