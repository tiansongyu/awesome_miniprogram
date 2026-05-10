# 代购微信小程序完整架构设计

## 概述

一个面向代购业务的微信小程序电商系统，支持三级代理分销、会员等级定价、扫码绑定、实时分润结算。包含客户端小程序、商户管理后台、后端API三大子系统。

## 业务模型

### 角色体系

| 角色 | 说明 | 权限 |
|------|------|------|
| SUPER_ADMIN | 系统超级管理员（一级代理/平台主） | 全部权限，最低拿货价 |
| AGENT_L1 | 一级代理（直系代理，约5人） | 管理下级、查看自己团队数据、开通二级 |
| AGENT_L2 | 二级代理 | 管理下级、查看自己团队数据、开通三级 |
| AGENT_L3 | 三级代理 | 面向终端客户，查看自己客户和收益 |
| CUSTOMER | 终端客户 | 浏览商品、下单、查看订单 |

### 代理层级规则

- 最多三级代理，不可再往下开
- 上级可以开通/冻结下级权限
- 客户扫码绑定代理后永久绑定，不可更改
- 每级代理赚取自己售价与拿货价之间的差价

### 会员等级

| 等级 | 条件 | 说明 |
|------|------|------|
| 铜会员 | 注册即是 | 基础会员价 |
| 银会员 | 累计消费满X元 或 手动升级 | 更优惠价格 |
| 金会员 | 累计消费满Y元 或 手动升级 | 最优会员价 |

### 定价体系

每个 SKU 有以下价格：
- 成本价（costPrice）
- 一级代理价（AGENT_L1）
- 二级代理价（AGENT_L2）
- 三级代理价（AGENT_L3）
- 金会员价（MEMBER_GOLD）
- 银会员价（MEMBER_SILVER）
- 铜会员价（MEMBER_BRONZE）
- 零售价（RETAIL）

### 分润计算

客户（绑定在三级代理C下）购买商品，价格链：
```
成本价 50 → L1价 60 → L2价 70 → L3价 80 → 客户支付 85（金会员价）
```
结算：
- L3代理C：85 - 80 = 5元
- L2代理B：80 - 70 = 10元
- L1代理A：70 - 60 = 10元

实时写入结算记录，累加到各代理余额。

---

## 技术架构

### 技术栈

| 层级 | 技术选型 |
|------|----------|
| 小程序前端 | Taro 4 + React 18 + TypeScript + Zustand + Animal Island 风格 |
| 管理后台 | React 18 + Vite + Ant Design Pro + Animal Island UI 点缀 |
| 后端 API | NestJS + TypeScript + Prisma ORM |
| 数据库 | PostgreSQL 16 |
| 缓存 | Redis 7 |
| 认证 | JWT + 微信 OAuth + 账号密码 |
| 文件存储 | 本地（开发）→ OSS（生产） |
| 构建工具 | pnpm + Turborepo |
| 容器化 | Docker + Docker Compose |
| 反向代理 | Nginx |
| 代码规范 | ESLint + Prettier + Husky |

### 项目结构

```
agent-saler-web/
├── apps/
│   ├── mini-program/               # Taro 4 + React 微信小程序
│   ├── admin-web/                  # React + Vite 管理后台
│   └── server/                     # NestJS 后端 API
├── packages/
│   ├── shared-types/               # 共享 TypeScript 类型
│   ├── ui-theme/                   # Animal Island 风格设计 token
│   └── utils/                      # 共享工具函数
├── docker/
│   ├── docker-compose.yml          # 本地开发
│   ├── docker-compose.prod.yml     # 生产部署
│   ├── Dockerfile.server
│   └── Dockerfile.admin
├── docs/
├── pnpm-workspace.yaml
└── turbo.json
```

### 后端模块设计

```
apps/server/src/
├── modules/
│   ├── auth/                    # 微信登录、JWT、管理员登录
│   ├── user/                    # 用户管理、会员等级
│   ├── agent/                   # 代理体系、层级关系、权限开通
│   ├── product/                 # 商品管理、分类、SKU、上下架
│   ├── order/                   # 订单、状态流转
│   ├── settlement/              # 差价计算、实时分润、流水
│   ├── membership/              # 会员等级、升级规则
│   ├── qrcode/                  # 代理专属码、客户绑定
│   ├── upload/                  # 文件上传
│   └── payment/                 # 模拟支付（后续替换微信支付）
├── common/
│   ├── guards/                  # 角色鉴权
│   ├── interceptors/            # 响应格式化
│   ├── decorators/              # 自定义装饰器
│   ├── filters/                 # 异常过滤
│   └── pipes/                   # 参数校验
├── config/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── app.module.ts
└── main.ts
```

---

## 数据库设计

```prisma
model User {
  id            String      @id @default(uuid())
  openId        String?     @unique
  phone         String?     @unique
  nickname      String?
  avatar        String?
  role          Role
  memberLevel   MemberLevel?
  parentAgentId String?
  parentAgent   User?       @relation("AgentTree", fields: [parentAgentId], references: [id])
  children      User[]      @relation("AgentTree")
  balance       Decimal     @default(0)
  bindCode      String?     @unique
  createdAt     DateTime    @default(now())
}

model Category {
  id        String     @id @default(uuid())
  name      String
  parentId  String?
  parent    Category?  @relation("CategoryTree", fields: [parentId], references: [id])
  children  Category[] @relation("CategoryTree")
  sort      Int        @default(0)
  products  Product[]
}

model Product {
  id          String        @id @default(uuid())
  name        String
  description String?
  images      String[]
  categoryId  String
  category    Category      @relation(fields: [categoryId], references: [id])
  status      ProductStatus
  skus        Sku[]
  createdAt   DateTime      @default(now())
}

model Sku {
  id        String     @id @default(uuid())
  productId String
  product   Product    @relation(fields: [productId], references: [id])
  specs     Json
  stock     Int        @default(0)
  costPrice Decimal
  prices    SkuPrice[]
}

model SkuPrice {
  id        String    @id @default(uuid())
  skuId     String
  sku       Sku       @relation(fields: [skuId], references: [id])
  priceType PriceType
  price     Decimal
  @@unique([skuId, priceType])
}

model Order {
  id          String      @id @default(uuid())
  orderNo     String      @unique
  userId      String
  agentId     String?
  totalAmount Decimal
  status      OrderStatus
  items       OrderItem[]
  settlements Settlement[]
  createdAt   DateTime    @default(now())
}

model OrderItem {
  id        String  @id @default(uuid())
  orderId   String
  order     Order   @relation(fields: [orderId], references: [id])
  skuId     String
  quantity  Int
  unitPrice Decimal
}

model Settlement {
  id          String   @id @default(uuid())
  orderId     String
  order       Order    @relation(fields: [orderId], references: [id])
  agentId     String
  agentLevel  Role
  profit      Decimal
  description String?
  createdAt   DateTime @default(now())
}

enum Role {
  SUPER_ADMIN
  AGENT_L1
  AGENT_L2
  AGENT_L3
  CUSTOMER
}

enum MemberLevel {
  GOLD
  SILVER
  BRONZE
}

enum ProductStatus {
  ON_SALE
  OFF_SALE
  DRAFT
}

enum OrderStatus {
  PENDING
  PAID
  SHIPPED
  COMPLETED
  CANCELLED
}

enum PriceType {
  AGENT_L1
  AGENT_L2
  AGENT_L3
  MEMBER_GOLD
  MEMBER_SILVER
  MEMBER_BRONZE
  RETAIL
}
```

---

## 前端设计

### 小程序端页面

| 页面 | 功能 |
|------|------|
| 首页 | 推荐商品、分类入口、搜索 |
| 分类页 | 多级分类浏览 |
| 商品详情 | SKU选择、加购、根据角色显示价格 |
| 购物车 | 商品列表、数量调整、结算 |
| 订单列表 | 各状态订单、订单详情 |
| 个人中心 | 会员信息、绑定关系、收货地址 |
| 代理中心 | 收益概览、下级管理、邀请码（代理角色可见） |

### 管理后台页面

| 页面 | 功能 |
|------|------|
| 数据概览 | 销售额、订单量、代理数、趋势图 |
| 商品管理 | CRUD、上下架、批量操作 |
| 分类管理 | 树形拖拽排序 |
| 订单管理 | 列表、详情、发货操作 |
| 代理管理 | 层级树、开通/冻结权限 |
| 会员管理 | 等级调整、客户列表 |
| 结算中心 | 流水记录、提现审核 |
| 定价管理 | 各级别价格批量设置 |
| 系统设置 | 小程序配置、支付配置 |

### 设计风格

- 基于 Animal Island UI（guokaigdg/animal-island-ui）的设计语言
- 提取设计 token：圆角、柔和配色、卡通气泡、温暖色调
- 小程序端：用 token 重写 Taro 组件（Animal Island UI 是 Web 组件，不能直接用于小程序）
- 管理后台：Ant Design Pro 基础 + Animal Island UI 品牌点缀

---

## 核心业务流程

### 客户扫码绑定

1. 客户扫描代理专属二维码
2. 小程序启动，携带 bindCode 参数
3. 微信授权登录（获取 openId）
4. 后端检查是否已绑定 → 未绑定则写入 parentAgentId
5. 永久绑定，进入首页

### 下单与分润

1. 客户选择商品 → SKU → 加购 → 提交订单
2. 后端根据会员等级确定支付价格
3. 支付成功 → 触发结算
4. 查找代理链：客户 → L3 → L2 → L1
5. 逐级计算差价，写入 Settlement，累加 balance

### 代理开通

1. 上级代理在管理后台/小程序代理中心新增下级
2. 生成邀请链接/二维码
3. 下级扫码授权 → 角色升级
4. 下级获得自己的邀请码，可继续发展下级（最多三级）

---

## 部署架构

### 本地开发

```
Docker Compose 启动 PostgreSQL + Redis
NestJS: pnpm --filter server dev (localhost:3000)
管理后台: pnpm --filter admin-web dev (localhost:5173)
小程序: pnpm --filter mini-program dev:weapp → 微信开发者工具
```

### 生产部署（VPS）

```
Docker Compose 启动全部服务：
- NestJS API 容器
- Nginx 容器（托管管理后台静态文件 + 反向代理 API）
- PostgreSQL 容器
- Redis 容器

域名备案 + HTTPS（Let's Encrypt）
微信小程序后台配置合法域名
```

---

## 安全设计

| 关注点 | 措施 |
|--------|------|
| 认证 | JWT 短期 token + Redis refresh token |
| 权限 | RBAC 守卫，代理只能操作自己下级 |
| 价格安全 | 后端计算价格，下单时重新校验 |
| 分润安全 | 数据库事务保证一致性 |
| 数据隔离 | Prisma 中间件全局过滤 |
| 接口限流 | Redis + NestJS Throttler |
| 输入校验 | class-validator 严格校验 |
| SQL注入 | Prisma 参数化查询 |

---

## API 设计

```
/api/v1/auth/*          # 认证
/api/v1/products/*      # 商品
/api/v1/orders/*        # 订单
/api/v1/agents/*        # 代理管理
/api/v1/settlements/*   # 结算
/api/v1/admin/*         # 管理后台专用
```

---

## 后续扩展

- 微信支付接入：实现 PaymentService 接口的微信支付版本
- 物流追踪：接入快递100等物流API
- 消息通知：微信模板消息/订阅消息
- 数据分析：销售报表、代理业绩排行
- 营销工具：优惠券、限时折扣、拼团
