import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { Button, Form, Input, InputNumber, Modal, Select, Space, Spin, Tree, message } from 'antd';
import type { DataNode } from 'antd/es/tree';
import { useEffect, useState } from 'react';
import {
  type Category,
  createCategory,
  deleteCategory,
  getCategories,
  updateCategory,
} from '../../api/products';

function flattenCategories(categories: Category[]): Category[] {
  const result: Category[] = [];
  function walk(list: Category[]) {
    for (const cat of list) {
      result.push(cat);
      if (cat.children?.length) walk(cat.children);
    }
  }
  walk(categories);
  return result;
}

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const data = await getCategories();
      setCategories(data);
    } catch {
      message.error('获取分类失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditing(cat);
    form.setFieldsValue({ name: cat.name, parentId: cat.parentId, sort: cat.sort });
    setModalOpen(true);
  };

  const handleDelete = (cat: Category) => {
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

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      if (editing) {
        await updateCategory(editing.id, { name: values.name, sort: values.sort });
        message.success('更新成功');
      } else {
        await createCategory({ name: values.name, parentId: values.parentId, sort: values.sort });
        message.success('创建成功');
      }
      setModalOpen(false);
      fetchCategories();
    } catch {
      // validation error or API error — message already shown for API errors
    } finally {
      setSubmitting(false);
    }
  };

  const flat = flattenCategories(categories);

  const renderTitle = (cat: Category): React.ReactNode => (
    <Space>
      <span>{cat.name}</span>
      <Button
        type="link"
        size="small"
        icon={<EditOutlined />}
        onClick={(e) => { e.stopPropagation(); openEdit(cat); }}
      />
      <Button
        type="link"
        size="small"
        danger
        icon={<DeleteOutlined />}
        onClick={(e) => { e.stopPropagation(); handleDelete(cat); }}
      />
    </Space>
  );

  function buildTreeDataWithActions(cats: Category[]): DataNode[] {
    return cats.map((cat) => ({
      key: cat.id,
      title: renderTitle(cat),
      children: cat.children ? buildTreeDataWithActions(cat.children) : [],
    }));
  }

  const treeData = buildTreeDataWithActions(categories);

  return (
    <PageContainer
      title="分类管理"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          新增分类
        </Button>
      }
    >
      <Spin spinning={loading}>
        {treeData.length > 0 ? (
          <Tree
            treeData={treeData}
            defaultExpandAll
            blockNode
          />
        ) : (
          !loading && <div style={{ color: '#999', padding: 24 }}>暂无分类数据</div>
        )}
      </Spin>

      <Modal
        title={editing ? '编辑分类' : '新增分类'}
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

          <Form.Item name="sort" label="排序">
            <InputNumber min={0} style={{ width: '100%' }} placeholder="数字越小越靠前" />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
}
