import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import {
  Avatar,
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Tooltip,
  Upload,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { UploadFile } from 'antd';
import { useEffect, useState } from 'react';
import {
  type Category,
  createCategory,
  deleteCategory,
  getCategories,
  updateCategory,
} from '../../api/products';

interface CategoryRow extends Category {
  _count?: { products: number };
}

function flattenCategories(categories: Category[]): Category[] {
  const result: Category[] = [];
  function walk(list: Category[], depth = 0) {
    for (const cat of list) {
      result.push({ ...cat, _depth: depth } as any);
      if (cat.children?.length) walk(cat.children, depth + 1);
    }
  }
  walk(categories);
  return result;
}

export default function Categories() {
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryRow | null>(null);
  const [parentId, setParentId] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [form] = Form.useForm();

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const data = await getCategories();
      setCategories(data as CategoryRow[]);
    } catch {
      message.error('获取分类失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const openCreate = (pId?: string) => {
    setEditing(null);
    setParentId(pId);
    form.resetFields();
    if (pId) {
      form.setFieldsValue({ parentId: pId });
    }
    setFileList([]);
    setModalOpen(true);
  };

  const openEdit = (cat: CategoryRow) => {
    setEditing(cat);
    setParentId(undefined);
    form.setFieldsValue({ name: cat.name, parentId: cat.parentId, sort: cat.sort });
    if (cat.image) {
      setFileList([
        {
          uid: '-1',
          name: 'image',
          status: 'done',
          url: cat.image.startsWith('http') ? cat.image : `http://localhost:3000${cat.image}`,
        },
      ]);
    } else {
      setFileList([]);
    }
    setModalOpen(true);
  };

  const handleDelete = (cat: CategoryRow) => {
    if (cat.children && cat.children.length > 0) {
      message.warning('该分类下有子分类，无法删除');
      return;
    }
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除分类「${cat.name}」吗？`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await deleteCategory(cat.id);
          message.success('删除成功');
          fetchCategories();
        } catch {
          message.error('删除失败');
        }
      },
    });
  };

  const handleSort = async (cat: CategoryRow, direction: 'up' | 'down') => {
    const siblings = findSiblings(cat);
    const index = siblings.findIndex((c) => c.id === cat.id);
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= siblings.length) return;

    const target = siblings[swapIndex];
    try {
      await Promise.all([
        updateCategory(cat.id, { sort: target.sort ?? swapIndex }),
        updateCategory(target.id, { sort: cat.sort ?? index }),
      ]);
      message.success('排序已更新');
      fetchCategories();
    } catch {
      message.error('排序更新失败');
    }
  };

  const findSiblings = (cat: CategoryRow): CategoryRow[] => {
    if (!cat.parentId) return categories;
    const flat = flattenCategories(categories);
    const parent = flat.find((c) => c.id === cat.parentId);
    return (parent?.children as CategoryRow[]) || [];
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      // Get image URL from fileList
      let image: string | undefined;
      if (fileList.length > 0) {
        const file = fileList[0];
        if (file.response?.data?.url) {
          image = file.response.data.url;
        } else if (file.url) {
          image = file.url;
        }
      }

      if (editing) {
        await updateCategory(editing.id, {
          name: values.name,
          sort: values.sort,
          image,
        });
        message.success('更新成功');
      } else {
        await createCategory({
          name: values.name,
          parentId: values.parentId,
          sort: values.sort,
          image,
        });
        message.success('创建成功');
      }
      setModalOpen(false);
      fetchCategories();
    } catch {
      // validation error or API error
    } finally {
      setSubmitting(false);
    }
  };

  const flat = flattenCategories(categories);

  const columns: ColumnsType<CategoryRow> = [
    {
      title: '分类名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: CategoryRow) => (
        <Space>
          {record.image && (
            <Avatar
              size="small"
              shape="square"
              src={record.image.startsWith('http') ? record.image : `http://localhost:3000${record.image}`}
            />
          )}
          <span>{name}</span>
        </Space>
      ),
    },
    {
      title: '商品数量',
      dataIndex: '_count',
      key: 'productCount',
      width: 100,
      align: 'center',
      render: (_count: { products: number } | undefined) => (
        <Tag color={_count?.products ? 'blue' : 'default'}>
          {_count?.products ?? 0}
        </Tag>
      ),
    },
    {
      title: '排序',
      dataIndex: 'sort',
      key: 'sort',
      width: 80,
      align: 'center',
    },
    {
      title: '排序操作',
      key: 'sortAction',
      width: 100,
      align: 'center',
      render: (_: unknown, record: CategoryRow) => {
        const siblings = findSiblings(record);
        const index = siblings.findIndex((c) => c.id === record.id);
        return (
          <Space size={4}>
            <Tooltip title="上移">
              <Button
                type="text"
                size="small"
                icon={<ArrowUpOutlined />}
                disabled={index === 0}
                onClick={() => handleSort(record, 'up')}
              />
            </Tooltip>
            <Tooltip title="下移">
              <Button
                type="text"
                size="small"
                icon={<ArrowDownOutlined />}
                disabled={index === siblings.length - 1}
                onClick={() => handleSort(record, 'down')}
              />
            </Tooltip>
          </Space>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: unknown, record: CategoryRow) => (
        <Space size={4}>
          <Tooltip title="添加子分类">
            <Button
              type="link"
              size="small"
              icon={<PlusOutlined />}
              onClick={() => openCreate(record.id)}
            />
          </Tooltip>
          <Tooltip title="编辑">
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => openEdit(record)}
            />
          </Tooltip>
          <Tooltip title={record.children && record.children.length > 0 ? '有子分类，无法删除' : '删除'}>
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
              disabled={!!(record.children && record.children.length > 0)}
              onClick={() => handleDelete(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      title="分类管理"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openCreate()}>
          新增分类
        </Button>
      }
    >
      <Spin spinning={loading}>
        <Table<CategoryRow>
          columns={columns}
          dataSource={categories}
          rowKey="id"
          pagination={false}
          expandable={{
            childrenColumnName: 'children',
            defaultExpandAllRows: true,
          }}
          locale={{ emptyText: '暂无分类数据' }}
        />
      </Spin>

      <Modal
        title={editing ? '编辑分类' : parentId ? '添加子分类' : '新增分类'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={submitting}
        okText="确定"
        cancelText="取消"
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label="分类名称"
            rules={[{ required: true, message: '请输入分类名称' }]}
          >
            <Input placeholder="请输入分类名称" />
          </Form.Item>

          {!editing && (
            <Form.Item name="parentId" label="父级分类">
              <Select allowClear placeholder="不选则为顶级分类">
                {flat.map((cat) => (
                  <Select.Option key={cat.id} value={cat.id}>
                    {cat.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          )}

          <Form.Item name="sort" label="排序值">
            <InputNumber min={0} style={{ width: '100%' }} placeholder="数字越小越靠前" />
          </Form.Item>

          <Form.Item label="分类图标/图片">
            <Upload
              listType="picture-card"
              fileList={fileList}
              action="http://localhost:3000/upload/image"
              headers={{ Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}` }}
              name="file"
              accept="image/*"
              maxCount={1}
              onChange={({ fileList: newList }) => setFileList(newList)}
              onPreview={(file) => {
                const url = file.url || file.thumbUrl;
                if (url) window.open(url, '_blank');
              }}
            >
              {fileList.length >= 1 ? null : (
                <div>
                  <PlusOutlined />
                  <div style={{ marginTop: 8 }}>上传</div>
                </div>
              )}
            </Upload>
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
}
