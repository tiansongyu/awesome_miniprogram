# Task 4: Prisma 数据库 Schema

**Files:**
- Create: `apps/server/prisma/schema.prisma`
- Create: `apps/server/src/prisma/prisma.module.ts`
- Create: `apps/server/src/prisma/prisma.service.ts`

---

- [ ] **Step 1: 创建 apps/server/prisma/schema.prisma**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
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

model User {
  id            String       @id @default(uuid())
  openId        String?      @unique
  phone         String?      @unique
  nickname      String?
  avatar        String?
  password      String?
  role          Role         @default(CUSTOMER)
  memberLevel   MemberLevel  @default(BRONZE)
  parentAgentId String?
  parentAgent   User?        @relation("AgentTree", fields: [parentAgentId], references: [id])
  children      User[]       @relation("AgentTree")
  balance       Decimal      @default(0) @db.Decimal(10, 2)
  bindCode      String?      @unique
  frozen        Boolean      @default(false)
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt

  orders      Order[]
  settlements Settlement[]

  @@map("users")
}

model Category {
  id        String     @id @default(uuid())
  name      String
  parentId  String?
  parent    Category?  @relation("CategoryTree", fields: [parentId], references: [id])
  children  Category[] @relation("CategoryTree")
  sort      Int        @default(0)
  products  Product[]
  createdAt DateTime   @default(now())

  @@map("categories")
}

model Product {
  id          String        @id @default(uuid())
  name        String
  description String?
  images      String[]
  categoryId  String
  category    Category      @relation(fields: [categoryId], references: [id])
  status      ProductStatus @default(DRAFT)
  skus        Sku[]
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  @@map("products")
}

model Sku {
  id        String     @id @default(uuid())
  productId String
  product   Product    @relation(fields: [productId], references: [id], onDelete: Cascade)
  specs     Json
  stock     Int        @default(0)
  costPrice Decimal    @db.Decimal(10, 2)
  prices    SkuPrice[]
  createdAt DateTime   @default(now())

  @@map("skus")
}

model SkuPrice {
  id        String    @id @default(uuid())
  skuId     String
  sku       Sku       @relation(fields: [skuId], references: [id], onDelete: Cascade)
  priceType PriceType
  price     Decimal   @db.Decimal(10, 2)

  @@unique([skuId, priceType])
  @@map("sku_prices")
}

model Order {
  id          String      @id @default(uuid())
  orderNo     String      @unique
  userId      String
  user        User        @relation(fields: [userId], references: [id])
  agentId     String?
  totalAmount Decimal     @db.Decimal(10, 2)
  status      OrderStatus @default(PENDING)
  items       OrderItem[]
  settlements Settlement[]
  remark      String?
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  @@map("orders")
}

model OrderItem {
  id        String  @id @default(uuid())
  orderId   String
  order     Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)
  skuId     String
  skuName   String
  specs     Json
  quantity  Int
  unitPrice Decimal @db.Decimal(10, 2)

  @@map("order_items")
}

model Settlement {
  id          String   @id @default(uuid())
  orderId     String
  order       Order    @relation(fields: [orderId], references: [id])
  agentId     String
  agent       User     @relation(fields: [agentId], references: [id])
  agentLevel  Role
  profit      Decimal  @db.Decimal(10, 2)
  description String?
  createdAt   DateTime @default(now())

  @@map("settlements")
}
```

- [ ] **Step 2: 创建 apps/server/src/prisma/prisma.service.ts**

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

- [ ] **Step 3: 创建 apps/server/src/prisma/prisma.module.ts**

```typescript
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

- [ ] **Step 4: 在 app.module.ts 中注册 PrismaModule**

修改 `apps/server/src/app.module.ts`，在 imports 中添加 `PrismaModule`：

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import configuration from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 60,
      },
    ]),
    PrismaModule,
  ],
})
export class AppModule {}
```

- [ ] **Step 5: 创建 .env 文件并运行迁移**

```bash
cp .env.example apps/server/.env
cd apps/server
npx prisma migrate dev --name init
npx prisma generate
```

Expected: 迁移成功，生成 Prisma Client。

- [ ] **Step 6: 验证服务启动**

```bash
pnpm --filter server dev
# 另一个终端验证
curl http://localhost:3000
```

Expected: 返回 404（无路由），但服务正常启动无报错。

- [ ] **Step 7: 提交**

```bash
git add .
git commit -m "feat: add prisma schema and database module"
```
