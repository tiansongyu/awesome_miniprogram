import { ProTable } from '@ant-design/pro-components';
import { PageContainer } from '@ant-design/pro-components';
import { Avatar, Dropdown, message, Tag } from 'antd';
import type { MenuProps } from 'antd';
import { UserOutlined } from '@ant-design/icons';

interface Member {
  id: string;
  nickname: string;
  avatar: string;
  memberLevel: 'BRONZE' | 'SILVER' | 'GOLD';
  createdAt: string;
}

const mockMembers: Member[] = [
  { id: '1', nickname: '客户A', avatar: '', memberLevel: 'BRONZE', createdAt: '2026-05-01' },
  { id: '2', nickname: '客户B', avatar: '', memberLevel: 'SILVER', createdAt: '2026-04-15' },
  { id: '3', nickname: '客户C', avatar: '', memberLevel: 'GOLD', createdAt: '2026-03-20' },
];

const levelConfig: Record<Member['memberLevel'], { label: string; color: string }> = {
  GOLD: { label: '金会员', color: 'gold' },
  SILVER: { label: '银会员', color: 'silver' },
  BRONZE: { label: '铜会员', color: 'default' },
};

export default function Members() {
  const getLevelMenuItems = (record: Member): MenuProps['items'] => [
    {
      key: 'BRONZE',
      label: '铜会员',
      onClick: () => {
        message.success(`已将 ${record.nickname} 调整为铜会员`);
      },
    },
    {
      key: 'SILVER',
      label: '银会员',
      onClick: () => {
        message.success(`已将 ${record.nickname} 调整为银会员`);
      },
    },
    {
      key: 'GOLD',
      label: '金会员',
      onClick: () => {
        message.success(`已将 ${record.nickname} 调整为金会员`);
      },
    },
  ];

  return (
    <PageContainer title="会员管理">
      <ProTable<Member>
        rowKey="id"
        headerTitle="会员列表"
        dataSource={mockMembers}
        search={false}
        pagination={{ pageSize: 20 }}
        columns={[
          {
            title: '昵称',
            dataIndex: 'nickname',
          },
          {
            title: '头像',
            dataIndex: 'avatar',
            render: (_, record) =>
              record.avatar ? (
                <Avatar src={record.avatar} />
              ) : (
                <Avatar icon={<UserOutlined />} />
              ),
          },
          {
            title: '会员等级',
            dataIndex: 'memberLevel',
            render: (_, record) => {
              const cfg = levelConfig[record.memberLevel];
              return <Tag color={cfg.color}>{cfg.label}</Tag>;
            },
          },
          {
            title: '注册时间',
            dataIndex: 'createdAt',
          },
          {
            title: '操作',
            valueType: 'option',
            render: (_: unknown, record: Member) => [
              <Dropdown
                key="adjust"
                menu={{ items: getLevelMenuItems(record) }}
              >
                <a>调整等级</a>
              </Dropdown>,
            ],
          },
        ]}
      />
    </PageContainer>
  );
}
