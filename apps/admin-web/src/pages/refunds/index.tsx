import { useRef, useState } from 'react';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { Tag, Button, message, Modal, Input } from 'antd';
import dayjs from 'dayjs';
import { getRefunds, approveRefund, rejectRefund } from '../../api/refunds';
import type { Refund } from '../../api/refunds';

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  PENDING:   { label: '待审核', color: 'orange' },
  APPROVED:  { label: '已同意', color: 'blue' },
  REJECTED:  { label: '已拒绝', color: 'red' },
  COMPLETED: { label: '已退款', color: 'green' },
};

export default function Refunds() {
  const actionRef = useRef<ActionType>(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectId, setRejectId] = useState<string>('');
  const [rejectRemark, setRejectRemark] = useState('');
  const [rejectLoading, setRejectLoading] = useState(false);

  const handleApprove = async (id: string) => {
    try {
      await approveRefund(id);
      message.success('已同意退款');
      actionRef.current?.reload();
    } catch {
      message.error('操作失败');
    }
  };

  const openRejectModal = (id: string) => {
    setRejectId(id);
    setRejectRemark('');
    setRejectModalOpen(true);
  };

  const handleReject = async () => {
    if (!rejectRemark.trim()) {
      message.warning('请填写拒绝原因');
      return;
    }
    setRejectLoading(true);
    try {
      await rejectRefund(rejectId, rejectRemark);
      message.success('已拒绝退款');
      setRejectModalOpen(false);
      actionRef.current?.reload();
    } catch {
      message.error('操作失败');
    } finally {
      setRejectLoading(false);
    }
  };

  const columns: ProColumns<Refund>[] = [
    { title: '订单号', dataIndex: 'orderNo', ellipsis: true },
    { title: '用户昵称', dataIndex: 'userNickname', search: false },
    { title: '退款原因', dataIndex: 'reason', search: false, ellipsis: true },
    {
      title: '退款金额',
      dataIndex: 'amount',
      search: false,
      valueType: 'money',
    },
    {
      title: '状态',
      dataIndex: 'status',
      valueType: 'select',
      valueEnum: {
        PENDING:   { text: '待审核' },
        APPROVED:  { text: '已同意' },
        REJECTED:  { text: '已拒绝' },
        COMPLETED: { text: '已退款' },
      },
      render: (_, record) => {
        const s = STATUS_MAP[record.status] || { label: record.status, color: 'default' };
        return <Tag color={s.color}>{s.label}</Tag>;
      },
    },
    {
      title: '申请时间',
      dataIndex: 'createdAt',
      search: false,
      render: (_, record) => dayjs(record.createdAt).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '操作',
      valueType: 'option',
      render: (_, record) =>
        record.status === 'PENDING' ? [
          <Button key="approve" type="link" onClick={() => handleApprove(record.id)}>
            同意
          </Button>,
          <Button key="reject" type="link" danger onClick={() => openRejectModal(record.id)}>
            拒绝
          </Button>,
        ] : '-',
    },
  ];

  return (
    <PageContainer title="退款管理">
      <ProTable<Refund>
        columns={columns}
        actionRef={actionRef}
        rowKey="id"
        request={async (params) => {
          const { current, pageSize, status, orderNo } = params;
          const res = await getRefunds({
            page: current,
            pageSize,
            status,
            ...( orderNo ? { orderNo } : {}),
          });
          return { data: res.items, total: res.total, success: true };
        }}
        pagination={{ defaultPageSize: 10 }}
        search={{ labelWidth: 'auto' }}
      />

      <Modal
        title="拒绝退款"
        open={rejectModalOpen}
        onOk={handleReject}
        onCancel={() => setRejectModalOpen(false)}
        confirmLoading={rejectLoading}
        okText="确认拒绝"
        cancelText="取消"
      >
        <Input.TextArea
          rows={4}
          placeholder="请输入拒绝原因"
          value={rejectRemark}
          onChange={(e) => setRejectRemark(e.target.value)}
        />
      </Modal>
    </PageContainer>
  );
}
