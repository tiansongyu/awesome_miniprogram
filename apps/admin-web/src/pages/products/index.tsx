import { DeleteOutlined, EyeOutlined, PlusOutlined } from '@ant-design/icons';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import {
  Button,
  Col,
  Collapse,
  Drawer,
  Form,
  Image,
  Input,
  InputNumber,
  Popconfirm,
  Row,
  Select,
  Space,
  Switch,
  Tag,
  Upload,
  message,
} from 'antd';
import type { UploadFile } from 'antd';
import { useEffect, useRef, useState } from 'react';
import {
  type Category,
  type Product,
  type Sku,
  type SkuPrice,
  createProduct,
  deleteProduct,
  getCategories,
  getProducts,
  updateProduct,
  updateProductStatus,
} from '../../api/products';

const PRICE_TYPES: { type: SkuPrice['type']; label: string }[] = [
  { type: 'AGENT_L1', label: '代理L1' },
  { type: 'AGENT_L2', label: '代理L2' },
  { type: 'AGENT_L3', label: '代理L3' },
  { type: 'MEMBER_GOLD', label: '金牌会员' },
  { type: 'MEMBER_SILVER', label: '银牌会员' },
  { type: 'MEMBER_BRONZE', label: '铜牌会员' },
  { type: 'RETAIL', label: '零售价' },
];

function emptySkuPrices(): SkuPrice[] {
  return PRICE_TYPES.map((p) => ({ type: p.type, price: 0 }));
}

function emptySkuRow(): Sku {
  return { specs: '{}', stock: 0, costPrice: 0, prices: emptySkuPrices() };
}

interface SkuRowProps {
  index: number;
  sku: Sku;
  onChange: (index: number, sku: Sku) => void;
  onRemove: (index: number) => void;
}

function SkuRow({ index, sku, onChange, onRemove }: SkuRowProps) {
  const update = (field: keyof Sku, value: unknown) => {
    onChange(index, { ...sku, [field]: value });
  };

  const updatePrice = (type: SkuPrice['type'], price: number) => {
    const prices = sku.prices.map((p) => (p.type === type ? { ...p, price } : p));
    onChange(index, { ...sku, prices });
  };

  return (
    <div
      style={{
        border: '1px solid #f0f0f0',
        borderRadius: 6,
        padding: 12,
        marginBottom: 12,
        background: '#fafafa',
      }}
    >
      <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
        <span style={{ fontWeight: 500 }}>SKU {index + 1}</span>
        <Button
          type="link"
          danger
          size="small"
          icon={<DeleteOutlined />}
          onClick={() => onRemove(index)}
        >
          删除
        </Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
        <Form.Item label="规格(JSON)" style={{ marginBottom: 0 }}>
          <Input
            value={sku.specs}
            onChange={(e) => update('specs', e.target.value)}
            placeholder='{"颜色":"红","尺寸":"M"}'
          />
        </Form.Item>
        <Form.Item label="库存" style={{ marginBottom: 0 }}>
          <InputNumber
            value={sku.stock}
            min={0}
            style={{ width: '100%' }}
            onChange={(v) => update('stock', v ?? 0)}
          />
        </Form.Item>
        <Form.Item label="成本价" style={{ marginBottom: 0 }}>
          <InputNumber
            value={sku.costPrice}
            min={0}
            precision={2}
            style={{ width: '100%' }}
            onChange={(v) => update('costPrice', v ?? 0)}
          />
        </Form.Item>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        {PRICE_TYPES.map((pt) => {
          const priceEntry = sku.prices.find((p) => p.type === pt.type);
          return (
            <Form.Item key={pt.type} label={pt.label} style={{ marginBottom: 0 }}>
              <InputNumber
                value={priceEntry?.price ?? 0}
                min={0}
                precision={2}
                style={{ width: '100%' }}
                onChange={(v) => updatePrice(pt.type, v ?? 0)}
              />
            </Form.Item>
          );
        })}
      </div>
    </div>
  );
}

export default function Products() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [skus, setSkus] = useState<Sku[]>([emptySkuRow()]);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const [form] = Form.useForm();
  const actionRef = useRef<ActionType>(null);

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch(() => message.error('获取分类失败'));
  }, []);

  function flattenCategories(cats: Category[]): Category[] {
    const result: Category[] = [];
    function walk(list: Category[]) {
      for (const c of list) {
        result.push(c);
        if (c.children?.length) walk(c.children);
      }
    }
    walk(cats);
    return result;
  }

  const flatCategories = flattenCategories(categories);

  const openCreate = () => {
    setEditing(null);
    setSkus([emptySkuRow()]);
    setFileList([]);
    form.resetFields();
    setDrawerOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditing(product);
    setSkus(
      product.skus && product.skus.length > 0
        ? product.skus.map((s: any) => ({
            ...s,
            specs: typeof s.specs === 'string' ? s.specs : JSON.stringify(s.specs),
            stock: Number(s.stock),
            costPrice: Number(s.costPrice),
            prices:
              s.prices && s.prices.length > 0
                ? s.prices.map((p: any) => ({ type: p.priceType || p.type, price: Number(p.price) }))
                : emptySkuPrices(),
          }))
        : [emptySkuRow()]
    );
    setFileList(
      (product.images || []).map((url, i) => ({
        uid: `-${i}`,
        name: url.split('/').pop() || `image-${i}`,
        status: 'done' as const,
        url: url.startsWith('http') ? url : `http://localhost:3000${url}`,
      }))
    );
    setDrawerOpen(true);
  };

  useEffect(() => {
    if (drawerOpen && editing) {
      form.setFieldsValue({
        name: editing.name,
        description: editing.description,
        categoryId: editing.categoryId,
        status: editing.status,
        detail: editing.detail || '',
      });
    }
  }, [drawerOpen, editing, form]);

  const handleDelete = async (product: Product) => {
    try {
      await deleteProduct(product.id);
      message.success('删除成功');
      actionRef.current?.reload();
    } catch {
      message.error('删除失败');
    }
  };

  const handleStatusToggle = async (product: Product) => {
    const nextStatus = product.status === 'ON_SALE' ? 'OFF_SALE' : 'ON_SALE';
    try {
      await updateProductStatus(product.id, nextStatus);
      message.success(nextStatus === 'ON_SALE' ? '已上架' : '已下架');
      actionRef.current?.reload();
    } catch {
      message.error('状态更新失败');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (skus.length === 0) {
        message.warning('请至少添加一个SKU');
        return;
      }
      setSubmitting(true);

      const images = fileList
        .filter((f) => f.status === 'done')
        .map((f) => f.response?.data?.url || f.url?.replace('http://localhost:3000', '') || '')
        .filter(Boolean);
      const formattedSkus = skus.map((sku) => ({
        specs: typeof sku.specs === 'string' ? JSON.parse(sku.specs || '{}') : sku.specs,
        stock: Number(sku.stock) || 0,
        costPrice: Number(sku.costPrice) || 0,
        prices: sku.prices.map((p) => ({ priceType: p.type, price: Number(p.price) || 0 })),
      }));

      const payload = {
        name: values.name,
        description: values.description || '',
        detail: values.detail || '',
        categoryId: values.categoryId,
        images,
        status: values.status || 'OFF_SALE',
        skus: formattedSkus,
      };

      console.log('Submit payload:', JSON.stringify(payload, null, 2));

      if (editing) {
        await updateProduct(editing.id, payload);
        message.success('更新成功');
      } else {
        await createProduct(payload);
        message.success('创建成功');
      }
      setDrawerOpen(false);
      actionRef.current?.reload();
    } catch (e: unknown) {
      console.error('Submit error:', e);
      if (e && typeof e === 'object' && 'errorFields' in e) return;
      message.error(e instanceof Error ? e.message : '操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  const columns: ProColumns<Product>[] = [
    {
      title: '商品图片',
      dataIndex: 'images',
      search: false,
      width: 80,
      render: (_, record) =>
        record.images && record.images.length > 0 ? (
          <img
            src={record.images[0].startsWith('http') ? record.images[0] : `http://localhost:3000${record.images[0]}`}
            alt={record.name}
            style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 4 }}
          />
        ) : (
          <div
            style={{
              width: 48,
              height: 48,
              background: '#f0f0f0',
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#bbb',
              fontSize: 12,
            }}
          >
            无图
          </div>
        ),
    },
    {
      title: '商品名称',
      dataIndex: 'name',
      fieldProps: { placeholder: '搜索商品名称' },
    },
    {
      title: '分类',
      dataIndex: 'categoryId',
      search: true,
      valueType: 'select',
      fieldProps: {
        options: flatCategories.map((c) => ({ label: c.name, value: c.id })),
        placeholder: '选择分类',
        allowClear: true,
      },
      render: (_, record) => record.category?.name ?? '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      valueType: 'select',
      fieldProps: {
        options: [
          { label: '上架', value: 'ON_SALE' },
          { label: '下架', value: 'OFF_SALE' },
        ],
        allowClear: true,
      },
      render: (_, record) => (
        <Tag color={record.status === 'ON_SALE' ? 'green' : 'default'}>
          {record.status === 'ON_SALE' ? '上架' : '下架'}
        </Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      search: false,
      valueType: 'dateTime',
    },
    {
      title: '操作',
      key: 'actions',
      search: false,
      width: 200,
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" onClick={() => openEdit(record)}>
            编辑
          </Button>
          <Switch
            size="small"
            checked={record.status === 'ON_SALE'}
            checkedChildren="上架"
            unCheckedChildren="下架"
            onChange={() => handleStatusToggle(record)}
          />
          <Popconfirm
            title="确认删除"
            description="确定要删除该商品吗？"
            onConfirm={() => handleDelete(record)}
            okText="删除"
            cancelText="取消"
          >
            <Button
              type="link"
              size="small"
              danger
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer title="商品管理">
      <ProTable<Product>
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        request={async (params) => {
          const { current, pageSize, name, categoryId, status } = params as {
            current?: number;
            pageSize?: number;
            name?: string;
            categoryId?: string;
            status?: string;
          };
          try {
            const result = await getProducts({
              page: current,
              pageSize,
              keyword: name,
              categoryId,
              status,
            });
            return {
              data: result.items,
              total: result.total,
              success: true,
            };
          } catch {
            return { data: [], total: 0, success: false };
          }
        }}
        toolBarRender={() => [
          <Button key="create" type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            新增商品
          </Button>,
        ]}
        pagination={{ defaultPageSize: 20, showSizeChanger: true }}
        search={{ labelWidth: 'auto' }}
      />

      <Drawer
        title={editing ? '编辑商品' : '新增商品'}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={900}
        forceRender
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, padding: '8px 0' }}>
            <Button onClick={() => setDrawerOpen(false)}>
              取消
            </Button>
            <Button type="primary" loading={submitting} onClick={handleSubmit}>
              {submitting ? '提交中...' : '确定'}
            </Button>
          </div>
        }
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="status" label="状态" initialValue="OFF_SALE">
                <Select>
                  <Select.Option value="ON_SALE">上架</Select.Option>
                  <Select.Option value="OFF_SALE">下架</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="商品名称"
                rules={[{ required: true, message: '请输入商品名称' }]}
              >
                <Input placeholder="请输入商品名称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="categoryId" label="分类" rules={[{ required: true, message: '请选择分类' }]}>
                <Select allowClear placeholder="请选择分类">
                  {flatCategories.map((c) => (
                    <Select.Option key={c.id} value={c.id}>
                      {c.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label="商品描述">
            <Input.TextArea rows={3} placeholder="请输入商品描述" />
          </Form.Item>

          <Form.Item label="商品图片">
            <Image.PreviewGroup>
              <Upload
                listType="picture-card"
                fileList={fileList}
                action="http://localhost:3000/upload/image"
                headers={{ Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}` }}
                name="file"
                accept="image/*"
                onChange={({ fileList: newList }) => setFileList(newList)}
                onPreview={(file) => {
                  const url = file.url || file.thumbUrl;
                  if (url) {
                    window.open(url, '_blank');
                  }
                }}
                itemRender={(originNode, file) => {
                  const url = file.url || file.thumbUrl;
                  return (
                    <div style={{ position: 'relative' }}>
                      {originNode}
                      {url && file.status === 'done' && (
                        <div
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'rgba(0,0,0,0.5)',
                            opacity: 0,
                            transition: 'opacity 0.3s',
                            cursor: 'pointer',
                            borderRadius: 8,
                          }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.opacity = '1'; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.opacity = '0'; }}
                          onClick={() => { setPreviewImage(url); setPreviewOpen(true); }}
                        >
                          <EyeOutlined style={{ color: '#fff', fontSize: 20 }} />
                        </div>
                      )}
                    </div>
                  );
                }}
              >
                {fileList.length >= 9 ? null : (
                  <div>
                    <PlusOutlined />
                    <div style={{ marginTop: 8 }}>上传</div>
                  </div>
                )}
              </Upload>
            </Image.PreviewGroup>
          </Form.Item>

          <Form.Item name="detail" label="商品详情">
            <ReactQuill theme="snow" placeholder="请输入商品详情..." style={{ minHeight: 300 }} />
          </Form.Item>
        </Form>

        <Collapse
          defaultActiveKey={['skus']}
          style={{ marginTop: 16 }}
          items={[
            {
              key: 'skus',
              label: (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <span style={{ fontWeight: 500, fontSize: 14 }}>SKU 列表 ({skus.length})</span>
                </div>
              ),
              extra: (
                <Button
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={(e) => { e.stopPropagation(); setSkus((prev) => [...prev, emptySkuRow()]); }}
                >
                  添加SKU
                </Button>
              ),
              children: (
                <>
                  {skus.map((sku, i) => (
                    <SkuRow
                      key={i}
                      index={i}
                      sku={sku}
                      onChange={(idx, updated) =>
                        setSkus((prev) => prev.map((s, j) => (j === idx ? updated : s)))
                      }
                      onRemove={(idx) =>
                        setSkus((prev) => prev.filter((_, j) => j !== idx))
                      }
                    />
                  ))}

                  {skus.length === 0 && (
                    <div style={{ color: '#999', textAlign: 'center', padding: '16px 0' }}>
                      暂无SKU，点击「添加SKU」新增
                    </div>
                  )}
                </>
              ),
            },
          ]}
        />
      </Drawer>

      <Image
        style={{ display: 'none' }}
        preview={{
          visible: previewOpen,
          src: previewImage,
          onVisibleChange: (visible) => setPreviewOpen(visible),
        }}
      />
    </PageContainer>
  );
}
