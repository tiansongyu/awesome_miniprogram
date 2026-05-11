import { useRef, useState } from 'react';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { Tag, Button, Drawer, Descriptions, Table, message, Space, Tabs, Modal, Form, Input } from 'antd';
import dayjs from 'dayjs';
import { getOrders, getOrderDetail, updateOrderStatus, shipOrder } from '../../api/orders';

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

interface OrderUser {
  id: string;
  nickname: string;
  phone: string;
}

interface Order {
  id: string;
  orderNo: string;
  userId: string;
  user?: OrderUser;
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
  const actionRef = useRef<ActionType>(null);
  const [activeTab, setActiveTab] = useState('ALL');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detail, setDetail] = useState<Order | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [shipModalOpen, setShipModalOpen] = useState(false);
  const [shipOrderId, setShipOrderId] = useState<string>('');
  const [shipLoading, setShipLoading] = useState(false);
  const [shipForm] = Form.useForm();

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

  const openShipModal = (record: Order) => {
    setShipOrderId(record.id);
    shipForm.resetFields();
    setShipModalOpen(true);
  };

  const handleShip = async () => {
    try {
      const values = await shipForm.validateFields();
      setShipLoading(true);
      await shipOrder(shipOrderId, values.expressCompany, values.expressNo);
      message.success('发货成功');
      setShipModalOpen(false);
      actionRef.current?.reload();
    } catch {
      message.error('发货失败');
    } finally {
      setShipLoading(false);
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
      title: '用户昵称',
      dataIndex: ['user', 'nickname'],
      width: 120,
      render: (_, record) => record.user?.nickname || record.userId,
    },
    {
      title: '商品信息',
      dataIndex: 'items',
      width: 200,
      ellipsis: true,
      render: (_, record) => {
        if (!record.items || record.items.length === 0) return '-';
        return record.items.map((item) => `${item.skuName}x${item.quantity}`).join(', ');
      },
    },
    {
      title: '总金额',
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
          {record.status === 'PENDING' && (
            <Button
              type="link"
              size="small"
              danger
              onClick={() => handleUpdateStatus(record, 'CANCELLED')}
            >
              取消
            </Button>
          )}
          {record.status === 'PAID' && (
            <Button
              type="link"
              size="small"
              onClick={() => openShipModal(record)}
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

      <Modal
        title="填写物流信息"
        open={shipModalOpen}
        onOk={handleShip}
        onCancel={() => setShipModalOpen(false)}
        confirmLoading={shipLoading}
        okText="确认发货"
        cancelText="取消"
      >
        <Form form={shipForm} layout="vertical">
          <Form.Item
            name="expressCompany"
            label="快递公司"
            rules={[{ required: true, message: '请输入快递公司' }]}
          >
            <Input placeholder="如：顺丰速运、中通快递" />
          </Form.Item>
          <Form.Item
            name="expressNo"
            label="快递单号"
            rules={[{ required: true, message: '请输入快递单号' }]}
          >
            <Input placeholder="请输入快递单号" />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
}
