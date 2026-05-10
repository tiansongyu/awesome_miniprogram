import { PageContainer, ProForm, ProFormText } from '@ant-design/pro-components';
import { Card, message } from 'antd';

export default function Settings() {
  return (
    <PageContainer title="系统设置">
      <Card title="基本配置" style={{ maxWidth: 640 }}>
        <ProForm
          submitter={{
            searchConfig: { submitText: '保存' },
            resetButtonProps: { style: { display: 'none' } },
          }}
          onFinish={async () => {
            message.success('设置已保存');
          }}
          initialValues={{
            appId: '',
            appSecret: '',
            systemName: '',
            logoUrl: '',
          }}
        >
          <ProFormText
            name="appId"
            label="小程序 AppID"
            placeholder="请输入小程序 AppID"
            disabled
            fieldProps={{ placeholder: 'wx1234567890abcdef' }}
          />
          <ProFormText
            name="appSecret"
            label="小程序 AppSecret"
            placeholder="请输入小程序 AppSecret"
            disabled
            fieldProps={{ placeholder: '••••••••••••••••••••••••••••••••' }}
          />
          <ProFormText
            name="systemName"
            label="系统名称"
            placeholder="请输入系统名称"
            rules={[{ required: true, message: '请输入系统名称' }]}
          />
          <ProFormText
            name="logoUrl"
            label="Logo URL"
            placeholder="请输入 Logo 图片地址"
          />
        </ProForm>
      </Card>
    </PageContainer>
  );
}
