import { useRef, useState } from 'react';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { Tag, Button, Drawer, Descriptions, Table, message, Space, Tabs } from 'antd';
import dayjs from 'dayjs';
import { getOrders, getOrderDetail, updateOrderStatus } from '../../api/orders';

interface OrderItem {
  id: string;
  skuName: string;
  specs: string;
  quantity: number;
  unitPrice: number;
}

interface Settlement {
  id: string;
  agentId: string;
  profit: number;
  agentLevel: string;
}

interface Order {
  id: string;
  orderNo: string;
  userId: string;
  totalAmount: number;
  status: 'PENDING' | 'PAID' | 'SHIPPED' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  items?: OrderItem[];
  settlements?: Settlement[];
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  PENDING:   { label: '待支付', color: 'orange' },
  PAID:      { label: '已支付', color: 'blue' },
  SHIPPED:   { label: '已发货', color: 'cyan' },
  COMPLETED: { label: '已完成', color: 'green' },
  CANCELLED: { label: '已取消', color: 'red' },
};

const TAB_STATUSES = [
  { key: 'ALL',       label: '全部' },
  { key: 'PENDING',   label: '待支付' },
  { key: 'PAID',      label: '已支付' },
  { key: 'SHIPPED',   label: '已发货' },
  { key: 'COMPLETED', label: '已完成' },
  { key: 'CANCELLED', label: '已取消' },
];

export default function Orders() {
  const actionRef = useRef<ActionType>();
  const [activeTab, setActiveTab] = useState('ALL');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detail, setDetail] = useState<Order | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const openDetail = async (record: Order) => {
    setDrawerOpen(true);
    setDetailLoading(true);
    try {
      const data = await getOrderDetail(record.id);
      setDetail(data as Order);
    } catch {
      message.error('获取订单详情失败');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleUpdateStatus = async (record: Order, status: string) => {
    try {
      await updateOrderStatus(record.id, status);
      message.success('状态更新成功');
      actionRef.current?.reload();
      if (drawerOpen && detail?.id === record.id) {
        openDetail(record);
      }
    } catch {
      message.error('状态更新失败');
    }
  };

  const columns: ProColumns<Order>[] = [
    {
      title: '订单号',
      dataIndex: 'orderNo',
      copyable: true,
      width: 200,
    },
    {
      title: '下单用户',
      dataIndex: 'userId',
      width: 120,
    },
    {
      title: '订单金额',
      dataIndex: 'totalAmount',
      width: 120,
      render: (_, record) => `¥${Number(record.totalAmount).toFixed(2)}`,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (_, record) => {
        const s = STATUS_MAP[record.status];
        return s ? <Tag color={s.color}>{s.label}</Tag> : <Tag>{record.status}</Tag>;
      },
    },
    {
      title: '下单时间',
      dataIndex: 'createdAt',
      width: 180,
      render: (_, record) => dayjs(record.createdAt).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '操作',
      valueType: 'option',
      width: 200,
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" onClick={() => openDetail(record)}>
            查看详情
          </Button>
          {record.status === 'PAID' && (
            <Button
              type="link"
              size="small"
              onClick={() => handleUpdateStatus(record, 'SHIPPED')}
            >
              发货
            </Button>
          )}
          {record.status === 'SHIPPED' && (
            <Button
              type="link"
              size="small"
              onClick={() => handleUpdateStatus(record, 'COMPLETED')}
            >
              完成
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const itemColumns = [
    { title: '商品名称', dataIndex: 'skuName', key: 'skuName' },
    { title: '规格', dataIndex: 'specs', key: 'specs' },
    { title: '数量', dataIndex: 'quantity', key: 'quantity', width: 80 },
    {
      title: '单价',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      width: 100,
      render: (val: number) => `¥${Number(val).toFixed(2)}`,
    },
  ];

  const settlementColumns = [
    { title: '代理ID', dataIndex: 'agentId', key: 'agentId' },
    { title: '代理等级', dataIndex: 'agentLevel', key: 'agentLevel', width: 100 },
    {
      title: '佣金',
      dataIndex: 'profit',
      key: 'profit',
      width: 100,
      render: (val: number) => `¥${Number(val).toFixed(2)}`,
    },
  ];

  return (
    <PageContainer title="订单管理">
      <Tabs
        activeKey={activeTab}
        onChange={(key) => {
          setActiveTab(key);
          actionRef.current?.reload();
        }}
        items={TAB_STATUSES.map((t) => ({ key: t.key, label: t.label }))}
        style={{ marginBottom: 16 }}
      />

      <ProTable<Order>
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        search={false}
        request={async (params) => {
          const { current = 1, pageSize = 20 } = params;
          const query: { page: number; pageSize: number; status?: string } = {
            page: current,
            pageSize,
          };
          if (activeTab !== 'ALL') {
            query.status = activeTab;
          }
          const data = await getOrders(query);
          return {
            data: data.list ?? data.items ?? (Array.isArray(data) ? data : []),
            success: true,
            total: data.total ?? (Array.isArray(data) ? data.length : 0),
          };
        }}
        pagination={{ defaultPageSize: 20, showSizeChanger: true }}
      />

      <Drawer
        title="订单详情"
        width={640}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        loading={detailLoading}
      >
        {detail && (
          <>
            <Descriptions bordered column={2} size="small" style={{ marginBottom: 24 }}>
              <Descriptions.Item label="订单号" span={2}>
                {detail.orderNo}
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                {(() => {
                  const s = STATUS_MAP[detail.status];
                  return s ? <Tag color={s.color}>{s.label}</Tag> : <Tag>{detail.status}</Tag>;
                })()}
              </Descriptions.Item>
              <Descriptions.Item label="订单金额">
                ¥{Number(detail.totalAmount).toFixed(2)}
              </Descriptions.Item>
              <Descriptions.Item label="下单时间" span={2}>
                {dayjs(detail.createdAt).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
            </Descriptions>

            <div style={{ marginBottom: 8, fontWeight: 600 }}>商品明细</div>
            <Table
              rowKey="id"
              size="small"
              columns={itemColumns}
              dataSource={detail.items ?? []}
              pagination={false}
              style={{ marginBottom: 24 }}
            />

            {detail.settlements && detail.settlements.length > 0 && (
              <>
                <div style={{ marginBottom: 8, fontWeight: 600 }}>结算记录</div>
                <Table
                  rowKey="id"
                  size="small"
                  columns={settlementColumns}
                  dataSource={detail.settlements}
                  pagination={false}
                />
              </>
            )}
          </>
        )}
      </Drawer>
    </PageContainer>
  );
}
