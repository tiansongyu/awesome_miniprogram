import { PageContainer, ProTable } from '@ant-design/pro-components';
import { Card, Col, Row, Statistic, Tag } from 'antd';

interface Settlement {
  id: string;
  orderNo: string;
  agentId: string;
  agentLevel: 'AGENT_L1' | 'AGENT_L2' | 'AGENT_L3';
  profit: number;
  createdAt: string;
}

const mockStats = { total: 58600, today: 1280, thisMonth: 12500 };

const mockSettlements: Settlement[] = [
  { id: '1', orderNo: 'ORD20260510ABC', agentId: 'agent1', agentLevel: 'AGENT_L1', profit: 50, createdAt: '2026-05-10 14:00' },
  { id: '2', orderNo: 'ORD20260510DEF', agentId: 'agent2', agentLevel: 'AGENT_L2', profit: 30, createdAt: '2026-05-10 13:00' },
  { id: '3', orderNo: 'ORD20260509GHI', agentId: 'agent3', agentLevel: 'AGENT_L3', profit: 15, createdAt: '2026-05-09 20:00' },
];

const agentLevelConfig: Record<Settlement['agentLevel'], { label: string; color: string }> = {
  AGENT_L1: { label: '一级代理', color: 'blue' },
  AGENT_L2: { label: '二级代理', color: 'cyan' },
  AGENT_L3: { label: '三级代理', color: 'geekblue' },
};

export default function Settlements() {
  return (
    <PageContainer title="结算中心">
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card>
            <Statistic
              title="累计收益"
              value={mockStats.total}
              prefix="¥"
              precision={2}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="今日收益"
              value={mockStats.today}
              prefix="¥"
              precision={2}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="本月收益"
              value={mockStats.thisMonth}
              prefix="¥"
              precision={2}
            />
          </Card>
        </Col>
      </Row>

      <ProTable<Settlement>
        rowKey="id"
        headerTitle="结算记录"
        dataSource={mockSettlements}
        search={false}
        pagination={{ pageSize: 20 }}
        columns={[
          {
            title: '订单号',
            dataIndex: 'orderNo',
          },
          {
            title: '代理',
            dataIndex: 'agentId',
          },
          {
            title: '代理级别',
            dataIndex: 'agentLevel',
            render: (_, record) => {
              const cfg = agentLevelConfig[record.agentLevel];
              return <Tag color={cfg.color}>{cfg.label}</Tag>;
            },
          },
          {
            title: '分润金额',
            dataIndex: 'profit',
            render: (_, record) => `¥${record.profit.toFixed(2)}`,
          },
          {
            title: '时间',
            dataIndex: 'createdAt',
          },
        ]}
      />
    </PageContainer>
  );
}
