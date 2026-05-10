# Task 14: 生产 Docker 部署 + Seed 数据

**Files:**
- Create: `docker/Dockerfile.server`
- Create: `docker/docker-compose.prod.yml`
- Create: `docker/nginx/default.conf`
- Create: `apps/server/prisma/seed.ts`
- Modify: `apps/server/package.json` (添加 prisma seed 配置)

---

- [ ] **Step 1: 创建 docker/Dockerfile.server**

```dockerfile
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/server/package.json ./apps/server/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/utils/package.json ./packages/utils/
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/server/node_modules ./apps/server/node_modules
COPY --from=deps /app/packages ./packages
COPY . .
RUN pnpm --filter server prisma generate
RUN pnpm --filter server build

FROM node:20-alpine AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nestjs

COPY --from=builder /app/apps/server/dist ./dist
COPY --from=builder /app/apps/server/node_modules ./node_modules
COPY --from=builder /app/apps/server/prisma ./prisma
COPY --from=builder /app/apps/server/package.json ./

USER nestjs
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

- [ ] **Step 2: 创建 docker/nginx/default.conf**

```nginx
upstream api {
    server server:3000;
}

server {
    listen 80;
    server_name _;

    client_max_body_size 10m;

    # API 反向代理
    location /api/ {
        proxy_pass http://api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 上传文件静态服务
    location /uploads/ {
        alias /app/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # 管理后台静态文件（后续添加）
    location / {
        root /usr/share/nginx/html;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
}
```

- [ ] **Step 3: 创建 docker/docker-compose.prod.yml**

```yaml
version: "3.9"

services:
  postgres:
    image: postgres:16-alpine
    container_name: agent-saler-postgres-prod
    restart: always
    environment:
      POSTGRES_USER: ${DB_USER:-postgres}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-postgres}
      POSTGRES_DB: ${DB_NAME:-agent_saler}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - internal

  redis:
    image: redis:7-alpine
    container_name: agent-saler-redis-prod
    restart: always
    command: redis-server --requirepass ${REDIS_PASSWORD:-redis123}
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD:-redis123}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - internal

  server:
    build:
      context: ..
      dockerfile: docker/Dockerfile.server
    container_name: agent-saler-server
    restart: always
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    environment:
      DATABASE_URL: postgresql://${DB_USER:-postgres}:${DB_PASSWORD:-postgres}@postgres:5432/${DB_NAME:-agent_saler}
      REDIS_URL: redis://:${REDIS_PASSWORD:-redis123}@redis:6379
      JWT_SECRET: ${JWT_SECRET}
      JWT_EXPIRES_IN: ${JWT_EXPIRES_IN:-15m}
      JWT_REFRESH_EXPIRES_IN: ${JWT_REFRESH_EXPIRES_IN:-7d}
      WECHAT_APP_ID: ${WECHAT_APP_ID}
      WECHAT_APP_SECRET: ${WECHAT_APP_SECRET}
      NODE_ENV: production
      PORT: 3000
    volumes:
      - uploads:/app/uploads
    networks:
      - internal

  nginx:
    image: nginx:alpine
    container_name: agent-saler-nginx
    restart: always
    depends_on:
      - server
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/default.conf:/etc/nginx/conf.d/default.conf
      - uploads:/app/uploads
    networks:
      - internal

volumes:
  postgres_data:
  redis_data:
  uploads:

networks:
  internal:
    driver: bridge
```

- [ ] **Step 4: 创建 Seed 数据**

`apps/server/prisma/seed.ts`:
```typescript
import { PrismaClient, Role, MemberLevel, ProductStatus, PriceType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // 创建超级管理员
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { phone: '13800000000' },
    update: {},
    create: {
      phone: '13800000000',
      nickname: '超级管理员',
      password: adminPassword,
      role: Role.SUPER_ADMIN,
      memberLevel: MemberLevel.GOLD,
      bindCode: 'ADMIN001',
    },
  });

  // 创建一级代理
  const agent1Password = await bcrypt.hash('agent123', 10);
  const agent1 = await prisma.user.upsert({
    where: { phone: '13800000001' },
    update: {},
    create: {
      phone: '13800000001',
      nickname: '一级代理-张三',
      password: agent1Password,
      role: Role.AGENT_L1,
      parentAgentId: admin.id,
      memberLevel: MemberLevel.GOLD,
      bindCode: 'AGENT1A',
    },
  });

  // 创建二级代理
  const agent2Password = await bcrypt.hash('agent123', 10);
  const agent2 = await prisma.user.upsert({
    where: { phone: '13800000002' },
    update: {},
    create: {
      phone: '13800000002',
      nickname: '二级代理-李四',
      password: agent2Password,
      role: Role.AGENT_L2,
      parentAgentId: agent1.id,
      memberLevel: MemberLevel.GOLD,
      bindCode: 'AGENT2A',
    },
  });

  // 创建三级代理
  const agent3Password = await bcrypt.hash('agent123', 10);
  const agent3 = await prisma.user.upsert({
    where: { phone: '13800000003' },
    update: {},
    create: {
      phone: '13800000003',
      nickname: '三级代理-王五',
      password: agent3Password,
      role: Role.AGENT_L3,
      parentAgentId: agent2.id,
      memberLevel: MemberLevel.GOLD,
      bindCode: 'AGENT3A',
    },
  });

  // 创建测试客户
  await prisma.user.upsert({
    where: { phone: '13800000010' },
    update: {},
    create: {
      phone: '13800000010',
      nickname: '测试客户-小明',
      role: Role.CUSTOMER,
      parentAgentId: agent3.id,
      memberLevel: MemberLevel.BRONZE,
    },
  });

  // 创建分类
  const skincare = await prisma.category.create({
    data: { name: '护肤品', sort: 1 },
  });
  const makeup = await prisma.category.create({
    data: { name: '彩妆', sort: 2 },
  });

  // 创建商品 + SKU + 价格
  const product = await prisma.product.create({
    data: {
      name: 'SK-II 神仙水 230ml',
      description: 'SK-II 护肤精华露，经典神仙水',
      images: ['/uploads/sample-skii.jpg'],
      categoryId: skincare.id,
      status: ProductStatus.ON_SALE,
      skus: {
        create: [
          {
            specs: { 规格: '230ml' },
            stock: 100,
            costPrice: 500,
            prices: {
              create: [
                { priceType: PriceType.AGENT_L1, price: 600 },
                { priceType: PriceType.AGENT_L2, price: 700 },
                { priceType: PriceType.AGENT_L3, price: 800 },
                { priceType: PriceType.MEMBER_GOLD, price: 850 },
                { priceType: PriceType.MEMBER_SILVER, price: 900 },
                { priceType: PriceType.MEMBER_BRONZE, price: 950 },
                { priceType: PriceType.RETAIL, price: 1000 },
              ],
            },
          },
        ],
      },
    },
  });

  console.log('Seed data created successfully');
  console.log('Admin: 13800000000 / admin123');
  console.log('Agent L1: 13800000001 / agent123');
  console.log('Agent L2: 13800000002 / agent123');
  console.log('Agent L3: 13800000003 / agent123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

- [ ] **Step 5: 在 apps/server/package.json 中添加 prisma seed 配置**

在 `package.json` 中添加：
```json
{
  "prisma": {
    "seed": "ts-node prisma/seed.ts"
  }
}
```

- [ ] **Step 6: 运行 seed**

```bash
cd apps/server
npx prisma db seed
```

Expected: 输出 seed 数据创建成功的日志。

- [ ] **Step 7: 创建生产环境 .env 模板**

`docker/.env.example`:
```env
DB_USER=postgres
DB_PASSWORD=change-me-in-production
DB_NAME=agent_saler
REDIS_PASSWORD=change-me-in-production
JWT_SECRET=change-me-in-production-use-random-string
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
WECHAT_APP_ID=your-app-id
WECHAT_APP_SECRET=your-app-secret
```

- [ ] **Step 8: 验证生产 Docker 构建**

```bash
cd docker
cp .env.example .env
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml ps
```

Expected: 所有 4 个容器 running。

- [ ] **Step 9: 运行生产环境数据库迁移**

```bash
docker exec agent-saler-server npx prisma migrate deploy
```

Expected: 迁移成功。

- [ ] **Step 10: 验证 API 可访问**

```bash
curl http://localhost/api/v1/categories
```

Expected: 返回 `{"code":0,"data":[],"message":"success"}`

- [ ] **Step 11: 停止生产容器，提交**

```bash
docker compose -f docker-compose.prod.yml down
git add .
git commit -m "feat: add production docker deployment and seed data"
```
