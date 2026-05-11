import { PageContainer, ProTable } from '@ant-design/pro-components';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { Modal, Select, Switch, Tag, message } from 'antd';
import { useRef, useState } from 'react';
import {
  type User,
  freezeUser,
  getUsers,
  unfreezeUser,
  updateMemberLevel,
  updateUserRole,
} from '../../api/users';

const ROLE_OPTIONS = [
  { label: '超级管理员', value: 'SUPER_ADMIN' },
  { label: '代理L1', value: 'AGENT_L1' },
  { label: '代理L2', value: 'AGENT_L2' },
  { label: '代理L3', value: 'AGENT_L3' },
  { label: '普通用户', value: 'CUSTOMER' },
];

const MEMBER_LEVEL_OPTIONS = [
  { label: '金牌会员', value: 'GOLD' },
  { label: '银牌会员', value: 'SILVER' },
  { label: '铜牌会员', value: 'BRONZE' },
];

const ROLE_COLOR_MAP: Record<string, string> = {
  SUPER_ADMIN: 'red',
  AGENT_L1: 'volcano',
  AGENT_L2: 'orange',
  AGENT_L3: 'gold',
  CUSTOMER: 'blue',
};

const ROLE_LABEL_MAP: Record<string, string> = {
  SUPER_ADMIN: '超级管理员',
  AGENT_L1: '代理L1',
  AGENT_L2: '代理L2',
  AGENT_L3: '代理L3',
  CUSTOMER: '普通用户',
};

const MEMBER_LEVEL_LABEL_MAP: Record<string, string> = {
  GOLD: '金牌会员',
  SILVER: '银牌会员',
  BRONZE: '铜牌会员',
};

export default function Users() {
  const actionRef = useRef<ActionType>();
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [levelModalOpen, setLevelModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [selectedLevel, setSelectedLevel] = useState<string>('');

  const handleRoleChange = async () => {
    if (!currentUser || !selectedRole) return;
    try {
      await updateUserRole(currentUser.id, selectedRole);
      message.success('角色修改成功');
      setRoleModalOpen(false);
      actionRef.current?.reload();
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : '操作失败');
    }
  };

  const handleLevelChange = async () => {
    if (!currentUser || !selectedLevel) return;
    try {
      await updateMemberLevel(currentUser.id, selectedLevel);
      message.success('会员等级修改成功');
      setLevelModalOpen(false);
      actionRef.current?.reload();
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : '操作失败');
    }
  };

  const handleFreezeToggle = async (user: User) => {
    try {
      if (user.frozen) {
        await unfreezeUser(user.id);
        message.success('已解冻');
      } else {
        await freezeUser(user.id);
        message.success('已冻结');
      }
      actionRef.current?.reload();
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : '操作失败');
    }
  };

  const columns: ProColumns<User>[] = [
    {
      title: '昵称',
      dataIndex: 'nickname',
      search: false,
    },
    {
      title: '手机号',
      dataIndex: 'phone',
      search: false,
    },
    {
      title: '角色',
      dataIndex: 'role',
      valueType: 'select',
      fieldProps: {
        options: ROLE_OPTIONS,
      },
      render: (_, record) => (
        <Tag color={ROLE_COLOR_MAP[record.role] || 'default'}>
          {ROLE_LABEL_MAP[record.role] || record.role}
        </Tag>
      ),
    },
    {
      title: '会员等级',
      dataIndex: 'memberLevel',
      search: false,
      render: (_, record) => (
        <Tag>{MEMBER_LEVEL_LABEL_MAP[record.memberLevel] || record.memberLevel || '-'}</Tag>
      ),
    },
    {
      title: '余额',
      dataIndex: 'balance',
      search: false,
      render: (_, record) => `¥${(record.balance / 100).toFixed(2)}`,
    },
    {
      title: '状态',
      dataIndex: 'frozen',
      search: false,
      render: (_, record) =>
        record.frozen ? <Tag color="red">已冻结</Tag> : <Tag color="green">正常</Tag>,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      valueType: 'dateTime',
      search: false,
    },
    {
      title: '操作',
      valueType: 'option',
      render: (_, record) => [
        <a
          key="role"
          onClick={() => {
            setCurrentUser(record);
            setSelectedRole(record.role);
            setRoleModalOpen(true);
          }}
        >
          修改角色
        </a>,
        <a
          key="level"
          onClick={() => {
            setCurrentUser(record);
            setSelectedLevel(record.memberLevel);
            setLevelModalOpen(true);
          }}
        >
          修改等级
        </a>,
        <Switch
          key="freeze"
          checked={!record.frozen}
          checkedChildren="正常"
          unCheckedChildren="冻结"
          onChange={() => handleFreezeToggle(record)}
          size="small"
        />,
      ],
    },
  ];

  return (
    <PageContainer title="用户管理">
      <ProTable<User>
        columns={columns}
        actionRef={actionRef}
        rowKey="id"
        request={async (params) => {
          const { current, pageSize, role } = params;
          const res = await getUsers({ page: current, pageSize, role });
          const data = res as unknown as { list: User[]; total: number };
          return {
            data: data.list,
            total: data.total,
            success: true,
          };
        }}
        pagination={{ defaultPageSize: 10 }}
        search={{ labelWidth: 'auto' }}
      />

      <Modal
        title="修改角色"
        open={roleModalOpen}
        onOk={handleRoleChange}
        onCancel={() => setRoleModalOpen(false)}
      >
        <Select
          style={{ width: '100%' }}
          value={selectedRole}
          onChange={setSelectedRole}
          options={ROLE_OPTIONS}
        />
      </Modal>

      <Modal
        title="修改会员等级"
        open={levelModalOpen}
        onOk={handleLevelChange}
        onCancel={() => setLevelModalOpen(false)}
      >
        <Select
          style={{ width: '100%' }}
          value={selectedLevel}
          onChange={setSelectedLevel}
          options={MEMBER_LEVEL_OPTIONS}
        />
      </Modal>
    </PageContainer>
  );
}
