import { PlusOutlined } from '@ant-design/icons';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import {
  Button,
  DatePicker,
  Drawer,
  Form,
  Input,
  InputNumber,
  Select,
  Tag,
  message,
} from 'antd';
import dayjs from 'dayjs';
import { useRef, useState } from 'react';
import {
  type Coupon,
  type CouponCreateData,
  createCoupon,
  getCoupons,
  updateCoupon,
} from '../../api/coupons';

const { RangePicker } = DatePicker;

export default function Coupons() {
  const actionRef = useRef<ActionType>();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [form] = Form.useForm();

  const openCreate = () => {
    setEditingCoupon(null);
    form.resetFields();
    form.setFieldsValue({ type: 'FIXED', status: 'ACTIVE' });
    setDrawerOpen(true);
  };

  const openEdit = (record: Coupon) => {
    setEditingCoupon(record);
    form.setFieldsValue({
      name: record.name,
      type: record.type,
      value: record.value,
      minSpend: record.minSpend,
      totalQty: record.totalQty,
      dateRange: [dayjs(record.startTime), dayjs(record.endTime)],
      status: record.status,
    });
    setDrawerOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const [startTime, endTime] = values.dateRange;
      const data: CouponCreateData = {
        name: values.name,
        type: values.type,
        value: values.value,
        minSpend: values.minSpend,
        totalQty: values.totalQty,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        status: values.status,
      };

      if (editingCoupon) {
        await updateCoupon(editingCoupon.id, data);
        message.success('更新成功');
      } else {
        await createCoupon(data);
        message.success('创建成功');
      }
      setDrawerOpen(false);
      actionRef.current?.reload();
    } catch (err) {
      // validation error, ignore
    }
  };

  const handleToggleStatus = async (record: Coupon) => {
    const newStatus = record.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    await updateCoupon(record.id, { status: newStatus });
    message.success(newStatus === 'ACTIVE' ? '已启用' : '已停用');
    actionRef.current?.reload();
  };

  const columns: ProColumns<Coupon>[] = [
    {
      title: '名称',
      dataIndex: 'name',
      ellipsis: true,
    },
    {
      title: '类型',
      dataIndex: 'type',
      valueEnum: {
        FIXED: { text: '满减' },
        PERCENT: { text: '折扣' },
      },
      width: 80,
    },
    {
      title: '优惠值',
      dataIndex: 'value',
      search: false,
      width: 100,
      render: (_, record) =>
        record.type === 'FIXED' ? `¥${record.value}` : `${record.value}%`,
    },
    {
      title: '最低消费',
      dataIndex: 'minSpend',
      search: false,
      width: 100,
      render: (_, record) => `¥${record.minSpend}`,
    },
    {
      title: '总量/已用',
      search: false,
      width: 110,
      render: (_, record) => `${record.usedQty}/${record.totalQty}`,
    },
    {
      title: '有效期',
      search: false,
      width: 200,
      render: (_, record) =>
        `${dayjs(record.startTime).format('YYYY-MM-DD')} ~ ${dayjs(record.endTime).format('YYYY-MM-DD')}`,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      valueEnum: {
        ACTIVE: { text: '启用', status: 'Success' },
        INACTIVE: { text: '停用', status: 'Default' },
      },
      render: (_, record) =>
        record.status === 'ACTIVE' ? (
          <Tag color="green">启用</Tag>
        ) : (
          <Tag color="default">停用</Tag>
        ),
    },
    {
      title: '操作',
      valueType: 'option',
      width: 150,
      render: (_, record) => [
        <a key="edit" onClick={() => openEdit(record)}>
          编辑
        </a>,
        <a key="toggle" onClick={() => handleToggleStatus(record)}>
          {record.status === 'ACTIVE' ? '停用' : '启用'}
        </a>,
      ],
    },
  ];

  return (
    <PageContainer>
      <ProTable<Coupon>
        columns={columns}
        actionRef={actionRef}
        rowKey="id"
        search={{ labelWidth: 'auto' }}
        request={async (params) => {
          const { current, pageSize, name, type, status } = params;
          const res = await getCoupons({
            page: current,
            pageSize,
            keyword: name,
            status: status || type ? status || type : undefined,
          });
          return {
            data: res.items,
            total: res.total,
            success: true,
          };
        }}
        toolBarRender={() => [
          <Button key="add" type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            新增优惠券
          </Button>,
        ]}
      />

      <Drawer
        title={editingCoupon ? '编辑优惠券' : '新增优惠券'}
        width={480}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        extra={
          <Button type="primary" onClick={handleSubmit}>
            保存
          </Button>
        }
      >
        <Form form={form} layout="vertical" initialValues={{ type: 'FIXED', status: 'ACTIVE' }}>
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入优惠券名称' }]}>
            <Input placeholder="请输入优惠券名称" />
          </Form.Item>

          <Form.Item name="type" label="类型" rules={[{ required: true }]}>
            <Select
              options={[
                { label: '满减', value: 'FIXED' },
                { label: '折扣', value: 'PERCENT' },
              ]}
            />
          </Form.Item>

          <Form.Item name="value" label="优惠值" rules={[{ required: true, message: '请输入优惠值' }]}>
            <InputNumber min={0} style={{ width: '100%' }} placeholder="满减填金额，折扣填百分比" />
          </Form.Item>

          <Form.Item
            name="minSpend"
            label="最低消费金额"
            rules={[{ required: true, message: '请输入最低消费金额' }]}
          >
            <InputNumber min={0} style={{ width: '100%' }} prefix="¥" placeholder="0表示无门槛" />
          </Form.Item>

          <Form.Item
            name="totalQty"
            label="发放总量"
            rules={[{ required: true, message: '请输入发放总量' }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} placeholder="请输入发放总量" />
          </Form.Item>

          <Form.Item
            name="dateRange"
            label="有效期"
            rules={[{ required: true, message: '请选择有效期' }]}
          >
            <RangePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="status" label="状态" rules={[{ required: true }]}>
            <Select
              options={[
                { label: '启用', value: 'ACTIVE' },
                { label: '停用', value: 'INACTIVE' },
              ]}
            />
          </Form.Item>
        </Form>
      </Drawer>
    </PageContainer>
  );
}
