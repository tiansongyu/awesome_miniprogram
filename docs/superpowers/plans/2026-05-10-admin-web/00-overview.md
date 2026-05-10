# 管理后台实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 实现完整的 React 管理后台，包含 9 个页面，对接已有的 NestJS 后端 API。

**Architecture:** Vite + React 18 + Ant Design Pro 组件库 + React Router v6 + Zustand 状态管理 + Axios HTTP 客户端。

**Tech Stack:** React 18, TypeScript, Vite, Ant Design (antd), @ant-design/pro-components, React Router v6, Zustand, Axios

---

## 任务分解（可并发）

| Task | 内容 | 依赖 |
|------|------|------|
| A | 项目初始化 + 路由 + 布局 + 登录页 | 无 |
| B | 数据概览 Dashboard | A |
| C | 商品管理 + 分类管理 | A |
| D | 订单管理 | A |
| E | 代理管理 | A |
| F | 会员管理 + 结算中心 + 定价管理 + 系统设置 | A |

Task B/C/D/E/F 可在 A 完成后并发执行。
