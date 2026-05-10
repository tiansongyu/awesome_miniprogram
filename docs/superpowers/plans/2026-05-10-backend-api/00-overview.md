# 代购小程序后端 API 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 搭建 monorepo 基础设施、Docker 开发环境、NestJS 后端 API，实现完整的代购业务后端。

**Architecture:** pnpm + Turborepo monorepo，NestJS 后端使用 Prisma ORM 连接 PostgreSQL，Redis 做缓存和 refresh token 存储。Docker Compose 管理本地开发环境（PostgreSQL + Redis）和生产部署。

**Tech Stack:** NestJS, TypeScript, Prisma, PostgreSQL 16, Redis 7, Docker, pnpm, Turborepo

---

## 计划文件索引

| 文件 | 内容 |
|------|------|
| [01-monorepo-docker.md](./01-monorepo-docker.md) | Task 1-2: Monorepo 初始化 + Docker 环境 |
| [02-nestjs-base.md](./02-nestjs-base.md) | Task 3-4: NestJS 项目骨架 + Prisma 数据库 |
| [03-auth-module.md](./03-auth-module.md) | Task 5-6: 认证模块（JWT + 微信登录 + 管理员登录） |
| [04-user-agent-module.md](./04-user-agent-module.md) | Task 7-8: 用户模块 + 代理体系模块 |
| [05-product-module.md](./05-product-module.md) | Task 9-10: 商品模块（分类 + SKU + 定价） |
| [06-order-settlement.md](./06-order-settlement.md) | Task 11-12: 订单模块 + 分润结算模块 |
| [07-extras.md](./07-extras.md) | Task 13-14: 二维码绑定 + 文件上传 + 生产 Docker 部署 |

## 文件结构总览

```
agent-saler-web/
├── apps/
│   └── server/                     # NestJS 后端
│       ├── src/
│       │   ├── modules/
│       │   │   ├── auth/
│       │   │   ├── user/
│       │   │   ├── agent/
│       │   │   ├── product/
│       │   │   ├── order/
│       │   │   ├── settlement/
│       │   │   ├── membership/
│       │   │   ├── qrcode/
│       │   │   ├── upload/
│       │   │   └── payment/
│       │   ├── common/
│       │   │   ├── guards/
│       │   │   ├── interceptors/
│       │   │   ├── decorators/
│       │   │   ├── filters/
│       │   │   └── pipes/
│       │   ├── config/
│       │   ├── prisma/
│       │   ├── app.module.ts
│       │   └── main.ts
│       ├── test/
│       ├── Dockerfile
│       └── package.json
├── packages/
│   ├── shared-types/               # 共享 TypeScript 类型
│   └── utils/                      # 共享工具函数
├── docker/
│   ├── docker-compose.yml          # 本地开发
│   ├── docker-compose.prod.yml     # 生产部署
│   ├── nginx/
│   │   └── default.conf
│   ├── Dockerfile.server
│   └── Dockerfile.admin
├── pnpm-workspace.yaml
├── turbo.json
├── package.json
├── .env.example
└── .gitignore
```
