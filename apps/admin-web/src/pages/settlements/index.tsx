import { useRef, useState, useEffect } from 'react';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { Card, Col, Row, Statistic, Tag, Tabs } from 'antd';
import dayjs from 'dayjs';
import { getSettlements, getSettlementStats } from '../../api/settlements';

type SettlementStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED';

interface Settlement {
  id: string;
  orderId: string;
  agentId: string;
  agentLevel: 'AGENT_L1' | 'AGENT_L2' | 'AGENT_L3';
  profit: number;
  status: SettlementStatus;
  description?: string;
  createdAt: string;
  order?: {
    orderNo: string;
    totalAmount: number;
    createdAt: string;
  };
  agent?: {
    id: string;
    nickname: string;
    phone: string;
    role: string;
  };
}

interface SettlementStatsData {
  totalProfit: number;
  pendingProfit: number;
  completedProfit: number;
}

const STATUS_MAP: Record<SettlementStatus, { label: string; color: string }> = {
  PENDING:   { label: '待结算', color: 'orange' },
  COMPLETED: { label: '已结算', color: 'green' },
  CANCELLED: { label: '已取消', color: 'red' },
};

const AGENT_LEVEL_MAP: Record<string, { label: string; color: string }> = {
  AGENT_L1: { label: '一级代理', color: 'blue' },
  AGENT_L2: { label: '二级代理', color: 'cyan' },
  AGENT_L3: { label: '三级代理', color: 'geekblue' },
};

const TAB_ITEMS = [
  { key: 'ALL',       label: '全部' },
  { key: 'PENDING',   label: '待结算' },
  { key: 'COMPLETED', label: '已结算' },
  { key: 'CANCELLED', label: '已取消' },
];

export default function Settlements() {
  const actionRef = useRef<ActionType>(null);
  const [activeTab, setActiveTab] = useState('ALL');
  const [stats, setStats] = useState<SettlementStatsData>({
    totalProfit: 0,
    pendingProfit: 0,
    completedProfit: 0,
  });

  useEffect(() => {
    getSettlementStats()
      .then((data) => {
        const d = data as Record<string, number>;
        setStats({
          totalProfit: d.totalProfit ?? 0,
          pendingProfit: d.pendingProfit ?? 0,
          completedProfit: d.completedProfit ?? 0,
        });
      })
      .catch(() => {});
  }, []);

  const columns: ProColumns<Settlement>[] = [
    {
      title: '订单号',
      dataIndex: ['order', 'orderNo'],
      ellipsis: true,
      width: 180,
    },
    {
      title: '代理昵称',
      dataIndex: ['agent', 'nickname'],
      width: 120,
    },
    {
      title: '代理等级',
      dataIndex: 'agentLevel',
      width: 100,
      render: (_, record) => {
        const cfg = AGENT_LEVEL_MAP[record.agentLevel];
        return cfg ? <Tag color={cfg.color}>{cfg.label}</Tag> : <Tag>{record.agentLevel}</Tag>;
      },
    },
    {
      title: '佣金金额',
      dataIndex: 'profit',
      width: 120,
      render: (_, record) => `¥${Number(record.profit).toFixed(2)}`,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (_, record) => {
        const cfg = STATUS_MAP[record.status];
        return cfg ? <Tag color={cfg.color}>{cfg.label}</Tag> : <Tag>{record.status}</Tag>;
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 180,
      render: (_, record) => dayjs(record.createdAt).format('YYYY-MM-DD HH:mm:ss'),
    },
  ];

  return (
    <PageContainer title="结算中心">
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card>
            <Statistic
              title="总佣金"
              value={stats.totalProfit}
              prefix="¥"
              precision={2}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="待结算金额"
              value={stats.pendingProfit}
              prefix="¥"
              precision={2}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="已结算金额"
              value={stats.completedProfit}
              prefix="¥"
              precision={2}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      <Tabs
        activeKey={activeTab}
        onChange={(key) => {
          setActiveTab(key);
          actionRef.current?.reload();
        }}
        items={TAB_ITEMS}
        style={{ marginBottom: 16 }}
      />

      <ProTable<Settlement>
        rowKey="id"
        actionRef={actionRef}
        headerTitle="结算记录"
        search={false}
        columns={columns}
        request={async (params) => {
          const { current = 1, pageSize = 20 } = params;
          const queryParams: Record<string, unknown> = {
            page: current,
            pageSize,
          };
          if (activeTab !== 'ALL') {
            queryParams.status = activeTab;
          }
          const res = await getSettlements(queryParams as { page?: number; pageSize?: number; status?: string });
          const data = res as unknown as { items: Settlement[]; total: number };
          return {
            data: data.items ?? [],
            total: data.total ?? 0,
            success: true,
          };
        }}
        pagination={{ defaultPageSize: 20, showSizeChanger: true }}
      />
    </PageContainer>
  );
}
