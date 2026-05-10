import { useRef, useState } from 'react';
import {
  PageContainer,
  ProTable,
  ModalForm,
  ProFormText,
  ProFormSelect,
} from '@ant-design/pro-components';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import {
  Badge,
  Button,
  Modal,
  Segmented,
  Space,
  Statistic,
  Tag,
  Tree,
  message,
} from 'antd';
import type { DataNode } from 'antd/es/tree';
import {
  getAgents,
  getAgentTree,
  createAgent,
  updateAgent,
  freezeAgent,
  unfreezeAgent,
  getAgentStats,
} from '../../api/agents';
import type { Agent, AgentTreeNode, AgentStats } from '../../api/agents';

const ROLE_CONFIG: Record<string, { label: string; color: string }> = {
  AGENT_L1: { label: '一级代理', color: 'blue' },
  AGENT_L2: { label: '二级代理', color: 'green' },
  AGENT_L3: { label: '三级代理', color: 'orange' },
};

function buildTreeData(nodes: AgentTreeNode[]): DataNode[] {
  return nodes.map((node) => {
    const roleConf = ROLE_CONFIG[node.role];
    const title = (
      <Space size={4}>
        <span>{node.nickname}</span>
        <Tag color={roleConf?.color}>{roleConf?.label ?? node.role}</Tag>
        {node.frozen && <Badge status="error" text="冻结" />}
      </Space>
    );
    return {
      key: node.id,
      title,
      children: node.children ? buildTreeData(node.children) : undefined,
    };
  });
}

export default function Agents() {
  const actionRef = useRef<ActionType>(null);
  const [view, setView] = useState<string | number>('列表视图');
  const [treeData, setTreeData] = useState<DataNode[]>([]);
  const [treeLoading, setTreeLoading] = useState(false);
  const [statsVisible, setStatsVisible] = useState(false);
  const [stats, setStats] = useState<AgentStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [editAgent, setEditAgent] = useState<Agent | null>(null);
  const [editVisible, setEditVisible] = useState(false);

  const handleViewChange = async (val: string | number) => {
    setView(val);
    if (val === '层级树') {
      setTreeLoading(true);
      try {
        const data = await getAgentTree();
        setTreeData(buildTreeData(data));
      } catch {
        message.error('获取代理树失败');
      } finally {
        setTreeLoading(false);
      }
    }
  };

  const handleViewStats = async (agent: Agent) => {
    setStatsVisible(true);
    setStats(null);
    setStatsLoading(true);
    try {
      const data = await getAgentStats(agent.id);
      setStats(data);
    } catch {
      message.error('获取统计失败');
    } finally {
      setStatsLoading(false);
    }
  };

  const handleFreezeToggle = async (agent: Agent) => {
    try {
      if (agent.frozen) {
        await unfreezeAgent(agent.id);
        message.success('已解冻');
      } else {
        await freezeAgent(agent.id);
        message.success('已冻结');
      }
      actionRef.current?.reload();
    } catch {
      message.error('操作失败');
    }
  };

  const columns: ProColumns<Agent>[] = [
    {
      title: '昵称',
      dataIndex: 'nickname',
      ellipsis: true,
    },
    {
      title: '手机号',
      dataIndex: 'phone',
      copyable: true,
    },
    {
      title: '角色',
      dataIndex: 'role',
      render: (_, record) => {
        const conf = ROLE_CONFIG[record.role];
        return <Tag color={conf?.color}>{conf?.label ?? record.role}</Tag>;
      },
    },
    {
      title: '状态',
      dataIndex: 'frozen',
      render: (_, record) =>
        record.frozen ? (
          <Badge status="error" text="冻结" />
        ) : (
          <Badge status="success" text="正常" />
        ),
    },
    {
      title: '下级数',
      dataIndex: 'subAgentCount',
      sorter: false,
    },
    {
      title: '余额',
      dataIndex: 'balance',
      render: (val) => `¥${Number(val).toFixed(2)}`,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      valueType: 'dateTime',
      hideInSearch: true,
    },
    {
      title: '操作',
      valueType: 'option',
      render: (_, record) => [
        <a key="stats" onClick={() => handleViewStats(record)}>
          查看统计
        </a>,
        <a
          key="freeze"
          onClick={() => handleFreezeToggle(record)}
          style={{ color: record.frozen ? '#52c41a' : '#ff4d4f' }}
        >
          {record.frozen ? '解冻' : '冻结'}
        </a>,
        <a
          key="edit"
          onClick={() => {
            setEditAgent(record);
            setEditVisible(true);
          }}
        >
          编辑
        </a>,
      ],
    },
  ];

  return (
    <PageContainer
      title="代理管理"
      extra={
        <Segmented
          options={['列表视图', '层级树']}
          value={view}
          onChange={handleViewChange}
        />
      }
    >
      {view === '列表视图' ? (
        <ProTable<Agent>
          actionRef={actionRef}
          rowKey="id"
          columns={columns}
          request={async (params) => {
            const data = await getAgents({
              page: params.current,
              pageSize: params.pageSize,
            });
            return {
              data: data.items,
              total: data.total,
              success: true,
            };
          }}
          toolBarRender={() => [
            <ModalForm
              key="create"
              title="新增代理"
              trigger={<Button type="primary">新增代理</Button>}
              onFinish={async (values: {
                phone: string;
                nickname: string;
                password?: string;
                role: string;
              }) => {
                await createAgent(values);
                message.success('创建成功');
                actionRef.current?.reload();
                return true;
              }}
            >
              <ProFormText
                name="phone"
                label="手机号"
                rules={[{ required: true, message: '请输入手机号' }]}
              />
              <ProFormText
                name="nickname"
                label="昵称"
                rules={[{ required: true, message: '请输入昵称' }]}
              />
              <ProFormText.Password name="password" label="密码" />
              <ProFormSelect
                name="role"
                label="角色"
                rules={[{ required: true, message: '请选择角色' }]}
                options={[
                  { label: '一级代理', value: 'AGENT_L1' },
                  { label: '二级代理', value: 'AGENT_L2' },
                  { label: '三级代理', value: 'AGENT_L3' },
                ]}
              />
            </ModalForm>,
          ]}
          pagination={{ defaultPageSize: 20 }}
        />
      ) : (
        <div style={{ padding: 24, background: '#fff', borderRadius: 8 }}>
          {treeLoading ? (
            <span>加载中...</span>
          ) : (
            <Tree treeData={treeData} defaultExpandAll showLine />
          )}
        </div>
      )}

      {/* Stats Modal */}
      <Modal
        title="代理统计"
        open={statsVisible}
        onCancel={() => setStatsVisible(false)}
        footer={null}
      >
        {statsLoading ? (
          <span>加载中...</span>
        ) : stats ? (
          <Space size={32}>
            <Statistic title="客户数量" value={stats.customerCount} />
            <Statistic title="下级代理数" value={stats.subAgentCount} />
            <Statistic
              title="累计收益"
              value={stats.totalProfit}
              prefix="¥"
              precision={2}
            />
          </Space>
        ) : null}
      </Modal>

      {/* Edit Modal */}
      {editAgent && (
        <ModalForm
          title="编辑代理"
          open={editVisible}
          onOpenChange={(open) => {
            setEditVisible(open);
            if (!open) setEditAgent(null);
          }}
          initialValues={{ nickname: editAgent.nickname }}
          onFinish={async (values: { nickname?: string }) => {
            await updateAgent(editAgent.id, values);
            message.success('更新成功');
            actionRef.current?.reload();
            return true;
          }}
        >
          <ProFormText
            name="nickname"
            label="昵称"
            rules={[{ required: true, message: '请输入昵称' }]}
          />
        </ModalForm>
      )}
    </PageContainer>
  );
}
