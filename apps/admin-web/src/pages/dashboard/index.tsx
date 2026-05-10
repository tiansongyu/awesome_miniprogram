import { PageContainer } from '@ant-design/pro-components';
import { Card, Table, Row, Col, Statistic, Tag } from 'antd';
import {
  ShoppingOutlined,
  OrderedListOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';

const mockStats = {
  todaySales: 12580,
  todayOrders: 36,
  totalAgents: 15,
  totalMembers: 238,
};

const mockRecentOrders = [
  { id: '1', orderNo: 'ORD20260510ABC123', totalAmount: 299, status: 'PAID', createdAt: '2026-05-10 14:30' },
  { id: '2', orderNo: 'ORD20260510DEF456', totalAmount: 158, status: 'SHIPPED', createdAt: '2026-05-10 13:20' },
  { id: '3', orderNo: 'ORD20260510GHI789', totalAmount: 520, status: 'COMPLETED', createdAt: '2026-05-10 11:05' },
  { id: '4', orderNo: 'ORD20260509JKL012', totalAmount: 89, status: 'PENDING', createdAt: '2026-05-09 22:15' },
  { id: '5', orderNo: 'ORD20260509MNO345', totalAmount: 1200, status: 'COMPLETED', createdAt: '2026-05-09 18:40' },
];

const statusMap: Record<string, { label: string; color: string }> = {
  PENDING: { label: '待支付', color: 'orange' },
  PAID: { label: '已支付', color: 'blue' },
  SHIPPED: { label: '已发货', color: 'cyan' },
  COMPLETED: { label: '已完成', color: 'green' },
  CANCELLED: { label: '已取消', color: 'red' },
};

const orderColumns = [
  {
    title: '订单号',
    dataIndex: 'orderNo',
    key: 'orderNo',
  },
  {
    title: '金额',
    dataIndex: 'totalAmount',
    key: 'totalAmount',
    render: (val: number) => `¥${val.toFixed(2)}`,
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    render: (val: string) => {
      const s = statusMap[val] ?? { label: val, color: 'default' };
      return <Tag color={s.color}>{s.label}</Tag>;
    },
  },
  {
    title: '时间',
    dataIndex: 'createdAt',
    key: 'createdAt',
  },
];

export default function Dashboard() {
  return (
    <PageContainer title="数据概览">
      <Row gutter={[16, 16]}>
        <Col span={6}>
          <Card>
            <Statistic
              title="今日销售额"
              value={mockStats.todaySales}
              precision={2}
              prefix={<ShoppingOutlined style={{ color: '#1677ff' }} />}
              valueStyle={{ color: '#1677ff' }}
              suffix="元"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="今日订单数"
              value={mockStats.todayOrders}
              prefix={<OrderedListOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
              suffix="单"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="代理总数"
              value={mockStats.totalAgents}
              prefix={<TeamOutlined style={{ color: '#faad14' }} />}
              valueStyle={{ color: '#faad14' }}
              suffix="人"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="会员总数"
              value={mockStats.totalMembers}
              prefix={<UserOutlined style={{ color: '#722ed1' }} />}
              valueStyle={{ color: '#722ed1' }}
              suffix="人"
            />
          </Card>
        </Col>
      </Row>

      <Card title="最近订单" style={{ marginTop: 16 }}>
        <Table
          rowKey="id"
          dataSource={mockRecentOrders}
          columns={orderColumns}
          pagination={false}
        />
      </Card>
    </PageContainer>
  );
}
