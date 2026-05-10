import { PageContainer } from '@ant-design/pro-components';
import { Card, Table, Typography } from 'antd';

const { Paragraph, Title } = Typography;

interface PriceTier {
  key: string;
  type: string;
  description: string;
  applicableTo: string;
}

const priceTiers: PriceTier[] = [
  { key: '1', type: '一级代理价', description: '平台给一级代理的结算价格', applicableTo: '一级代理商' },
  { key: '2', type: '二级代理价', description: '一级代理给二级代理的结算价格', applicableTo: '二级代理商' },
  { key: '3', type: '三级代理价', description: '二级代理给三级代理的结算价格', applicableTo: '三级代理商' },
  { key: '4', type: '金会员价', description: '金会员享受的优惠价格', applicableTo: '金会员用户' },
  { key: '5', type: '银会员价', description: '银会员享受的优惠价格', applicableTo: '银会员用户' },
  { key: '6', type: '铜会员价', description: '铜会员享受的基础优惠价格', applicableTo: '铜会员用户' },
  { key: '7', type: '零售价', description: '面向普通用户的标准售价', applicableTo: '普通用户' },
];

const columns = [
  { title: '价格类型', dataIndex: 'type', key: 'type' },
  { title: '说明', dataIndex: 'description', key: 'description' },
  { title: '适用对象', dataIndex: 'applicableTo', key: 'applicableTo' },
];

export default function Pricing() {
  return (
    <PageContainer title="定价管理">
      <Card style={{ marginBottom: 24 }}>
        <Title level={5}>定价体系说明</Title>
        <Paragraph>
          本系统采用多级定价体系，支持代理分销与会员优惠两条定价线。每个 SKU
          可独立配置各级价格，实现灵活的价格管理。
        </Paragraph>
        <Paragraph>
          代理价格体系：平台 → 一级代理 → 二级代理 → 三级代理，每级之间的差价即为对应代理的分润空间。
        </Paragraph>
        <Paragraph>
          会员价格体系：金会员 &gt; 银会员 &gt; 铜会员，会员等级越高享受的折扣越大。
        </Paragraph>
        <Paragraph type="secondary">
          具体价格请前往「商品管理」页面，在对应 SKU 中进行设置。
        </Paragraph>
      </Card>

      <Card title="价格类型一览">
        <Table
          rowKey="key"
          dataSource={priceTiers}
          columns={columns}
          pagination={false}
        />
      </Card>
    </PageContainer>
  );
}
