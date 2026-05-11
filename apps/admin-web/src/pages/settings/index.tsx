import { PageContainer } from '@ant-design/pro-components';
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  message,
  Select,
  Switch,
  Tabs,
  Upload,
} from 'antd';
import { UploadOutlined } from '@ant-design/icons';

function BasicSettings() {
  const [form] = Form.useForm();

  const onFinish = (values: Record<string, unknown>) => {
    console.log('基本设置提交数据:', values);
    message.success('基本设置已保存');
  };

  return (
    <Form form={form} layout="vertical" onFinish={onFinish} style={{ maxWidth: 600 }}>
      <Form.Item
        name="mallName"
        label="商城名称"
        rules={[{ required: true, message: '请输入商城名称' }]}
      >
        <Input placeholder="请输入商城名称" />
      </Form.Item>

      <Form.Item name="logo" label="商城 Logo" valuePropName="fileList" getValueFromEvent={(e) => (Array.isArray(e) ? e : e?.fileList)}>
        <Upload beforeUpload={() => false} maxCount={1} listType="picture">
          <Button icon={<UploadOutlined />}>上传 Logo</Button>
        </Upload>
      </Form.Item>

      <Form.Item
        name="contactPhone"
        label="联系电话"
        rules={[{ pattern: /^[\d\-+]+$/, message: '请输入有效的电话号码' }]}
      >
        <Input placeholder="请输入联系电话" />
      </Form.Item>

      <Form.Item name="serviceWechat" label="客服微信号">
        <Input placeholder="请输入客服微信号" />
      </Form.Item>

      <Form.Item>
        <Button type="primary" htmlType="submit">
          保存设置
        </Button>
      </Form.Item>
    </Form>
  );
}

function DistributionSettings() {
  const [form] = Form.useForm();

  const onFinish = (values: Record<string, unknown>) => {
    console.log('分销设置提交数据:', values);
    message.success('分销设置已保存');
  };

  return (
    <Form form={form} layout="vertical" onFinish={onFinish} style={{ maxWidth: 600 }}>
      <Form.Item
        name="level1Commission"
        label="一级代理佣金比例（%）"
        rules={[{ required: true, message: '请输入一级代理佣金比例' }]}
      >
        <InputNumber min={0} max={100} precision={2} addonAfter="%" style={{ width: '100%' }} placeholder="请输入一级代理佣金比例" />
      </Form.Item>

      <Form.Item
        name="level2Commission"
        label="二级代理佣金比例（%）"
        rules={[{ required: true, message: '请输入二级代理佣金比例' }]}
      >
        <InputNumber min={0} max={100} precision={2} addonAfter="%" style={{ width: '100%' }} placeholder="请输入二级代理佣金比例" />
      </Form.Item>

      <Form.Item
        name="level3Commission"
        label="三级代理佣金比例（%）"
        rules={[{ required: true, message: '请输入三级代理佣金比例' }]}
      >
        <InputNumber min={0} max={100} precision={2} addonAfter="%" style={{ width: '100%' }} placeholder="请输入三级代理佣金比例" />
      </Form.Item>

      <Form.Item name="autoSettle" label="自动结算" valuePropName="checked">
        <Switch />
      </Form.Item>

      <Form.Item name="settleCycle" label="结算周期">
        <Select placeholder="请选择结算周期">
          <Select.Option value="instant">即时</Select.Option>
          <Select.Option value="daily">每日</Select.Option>
          <Select.Option value="weekly">每周</Select.Option>
          <Select.Option value="monthly">每月</Select.Option>
        </Select>
      </Form.Item>

      <Form.Item>
        <Button type="primary" htmlType="submit">
          保存设置
        </Button>
      </Form.Item>
    </Form>
  );
}

function PaymentSettings() {
  const [form] = Form.useForm();

  const onFinish = (values: Record<string, unknown>) => {
    console.log('支付设置提交数据:', values);
    message.success('支付设置已保存');
  };

  return (
    <Form form={form} layout="vertical" onFinish={onFinish} style={{ maxWidth: 600 }}>
      <Form.Item
        name="wechatMerchantId"
        label="微信支付商户号"
        rules={[{ required: true, message: '请输入微信支付商户号' }]}
      >
        <Input placeholder="请输入微信支付商户号" />
      </Form.Item>

      <Form.Item
        name="wechatApiKey"
        label="微信支付 API 密钥"
        rules={[{ required: true, message: '请输入微信支付 API 密钥' }]}
      >
        <Input.Password placeholder="请输入微信支付 API 密钥" />
      </Form.Item>

      <Form.Item
        name="paymentCallbackUrl"
        label="支付回调地址"
        rules={[{ type: 'url', message: '请输入有效的 URL 地址' }]}
      >
        <Input placeholder="请输入支付回调地址，如 https://example.com/callback" />
      </Form.Item>

      <Form.Item>
        <Button type="primary" htmlType="submit">
          保存设置
        </Button>
      </Form.Item>
    </Form>
  );
}

function ShippingSettings() {
  const [form] = Form.useForm();

  const onFinish = (values: Record<string, unknown>) => {
    console.log('物流设置提交数据:', values);
    message.success('物流设置已保存');
  };

  return (
    <Form form={form} layout="vertical" onFinish={onFinish} style={{ maxWidth: 600 }}>
      <Form.Item name="defaultExpress" label="默认快递公司">
        <Select placeholder="请选择默认快递公司">
          <Select.Option value="sf">顺丰速运</Select.Option>
          <Select.Option value="yt">圆通速递</Select.Option>
          <Select.Option value="zt">中通快递</Select.Option>
          <Select.Option value="st">申通快递</Select.Option>
          <Select.Option value="yd">韵达快递</Select.Option>
          <Select.Option value="jd">京东物流</Select.Option>
          <Select.Option value="ems">EMS</Select.Option>
        </Select>
      </Form.Item>

      <Form.Item name="freeShippingAmount" label="包邮金额">
        <InputNumber min={0} precision={2} addonAfter="元" style={{ width: '100%' }} placeholder="订单满此金额包邮" />
      </Form.Item>

      <Form.Item name="shippingFee" label="运费">
        <InputNumber min={0} precision={2} addonAfter="元" style={{ width: '100%' }} placeholder="请输入默认运费" />
      </Form.Item>

      <Form.Item>
        <Button type="primary" htmlType="submit">
          保存设置
        </Button>
      </Form.Item>
    </Form>
  );
}

const tabItems = [
  { key: 'basic', label: '基本设置', children: <BasicSettings /> },
  { key: 'distribution', label: '分销设置', children: <DistributionSettings /> },
  { key: 'payment', label: '支付设置', children: <PaymentSettings /> },
  { key: 'shipping', label: '物流设置', children: <ShippingSettings /> },
];

export default function Settings() {
  return (
    <PageContainer title="系统设置">
      <Card>
        <Tabs defaultActiveKey="basic" items={tabItems} />
      </Card>
    </PageContainer>
  );
}
