# Task 1: Monorepo 初始化

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `packages/shared-types/package.json`
- Create: `packages/shared-types/src/index.ts`
- Create: `packages/utils/package.json`
- Create: `packages/utils/src/index.ts`

---

- [ ] **Step 1: 初始化 git 仓库**

```bash
cd /Users/tiansongyu/workspace/agent_saler_web
git init
```

- [ ] **Step 2: 创建根 package.json**

```json
{
  "name": "agent-saler-web",
  "private": true,
  "packageManager": "pnpm@9.15.4",
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "test": "turbo run test",
    "db:migrate": "pnpm --filter server prisma migrate dev",
    "db:generate": "pnpm --filter server prisma generate",
    "db:seed": "pnpm --filter server prisma db seed",
    "docker:up": "docker compose -f docker/docker-compose.yml up -d",
    "docker:down": "docker compose -f docker/docker-compose.yml down"
  },
  "devDependencies": {
    "turbo": "^2.3.0",
    "typescript": "^5.7.0"
  }
}
```

- [ ] **Step 3: 创建 pnpm-workspace.yaml**

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

- [ ] **Step 4: 创建 turbo.json**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {},
    "test": {}
  }
}
```

- [ ] **Step 5: 创建 .gitignore**

```
node_modules/
dist/
.env
*.log
.turbo/
coverage/
.DS_Store
```

- [ ] **Step 6: 创建 .env.example**

```env
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/agent_saler
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-jwt-secret-change-in-production
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# WeChat Mini Program
WECHAT_APP_ID=your-app-id
WECHAT_APP_SECRET=your-app-secret

# Server
PORT=3000
NODE_ENV=development
```

- [ ] **Step 7: 创建 packages/shared-types**

`packages/shared-types/package.json`:
```json
{
  "name": "@agent-saler/shared-types",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "build": "tsc",
    "lint": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.7.0"
  }
}
```

`packages/shared-types/src/index.ts`:
```typescript
export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  AGENT_L1 = 'AGENT_L1',
  AGENT_L2 = 'AGENT_L2',
  AGENT_L3 = 'AGENT_L3',
  CUSTOMER = 'CUSTOMER',
}

export enum MemberLevel {
  GOLD = 'GOLD',
  SILVER = 'SILVER',
  BRONZE = 'BRONZE',
}

export enum ProductStatus {
  ON_SALE = 'ON_SALE',
  OFF_SALE = 'OFF_SALE',
  DRAFT = 'DRAFT',
}

export enum OrderStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  SHIPPED = 'SHIPPED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum PriceType {
  AGENT_L1 = 'AGENT_L1',
  AGENT_L2 = 'AGENT_L2',
  AGENT_L3 = 'AGENT_L3',
  MEMBER_GOLD = 'MEMBER_GOLD',
  MEMBER_SILVER = 'MEMBER_SILVER',
  MEMBER_BRONZE = 'MEMBER_BRONZE',
  RETAIL = 'RETAIL',
}
```

- [ ] **Step 8: 创建 packages/utils**

`packages/utils/package.json`:
```json
{
  "name": "@agent-saler/utils",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "build": "tsc",
    "lint": "tsc --noEmit",
    "test": "jest"
  },
  "devDependencies": {
    "typescript": "^5.7.0"
  }
}
```

`packages/utils/src/index.ts`:
```typescript
export function generateOrderNo(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `ORD${date}${random}`;
}

export function generateBindCode(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}
```

- [ ] **Step 9: 安装依赖并验证**

```bash
pnpm install
pnpm lint
```

- [ ] **Step 10: 提交**

```bash
git add .
git commit -m "feat: initialize monorepo with pnpm + turborepo"
```

---

# Task 2: Docker 本地开发环境

**Files:**
- Create: `docker/docker-compose.yml`
- Create: `docker/.env`

---

- [ ] **Step 1: 创建 docker/docker-compose.yml**

```yaml
version: "3.9"

services:
  postgres:
    image: postgres:16-alpine
    container_name: agent-saler-postgres
    restart: unless-stopped
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: agent_saler
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: agent-saler-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
  redis_data:
```

- [ ] **Step 2: 启动 Docker 容器并验证**

```bash
docker compose -f docker/docker-compose.yml up -d
docker compose -f docker/docker-compose.yml ps
```

Expected: 两个容器 running，health 状态 healthy。

- [ ] **Step 3: 验证数据库连接**

```bash
docker exec agent-saler-postgres psql -U postgres -d agent_saler -c "SELECT 1;"
docker exec agent-saler-redis redis-cli ping
```

Expected: 数据库返回 `1`，Redis 返回 `PONG`。

- [ ] **Step 4: 提交**

```bash
git add docker/
git commit -m "feat: add docker-compose for local dev (postgres + redis)"
```
