# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

<system-reminder>必须先阅读 AGENTS.md。</system-reminder>

## 项目概述

**autoccTest** — 自动化通用项目验收测试平台。核心思路：将验收测试抽象为"报文（消息/表单）填写 → 发送 → 验证响应"的标准流程，让测试人员无需写代码即可完成自动化验收测试。

项目当前处于 **0→1 构建阶段**。技术栈已确定（详见 `docs/exec-plans/active/tech-stack-selection.md`），核心架构模块见 `docs/ARCHITECTURE.md`。

## 核心概念

- **报文（Message/Form）**：测试用例的载体，包含请求数据、断言规则和预期响应。所有测试逻辑围绕报文的填写、组合与验证展开。
- **通用性**：不绑定特定被测系统，通过适配器/插件机制接入不同的协议（HTTP、gRPC、WebSocket、数据库等）和报文格式（JSON、XML、Protobuf 等）。
- **自动化**：从用例编辑、执行调度、结果比对到报告生成全链路自动化。

## 常用命令

```bash
# 仓库基础检查（文档完整性、卫生检查）
make check-docs
make check-repo

# CI 完整检查
make ci

# 创建新的执行计划
make new-plan SLUG=计划名称

# 创建变更记录
make new-history SLUG=变更名称
```

## 架构概览

```
apps/
  api/          → FastAPI API 服务（Python 3.12+）
  admin/        → React 管理台（Vite + Ant Design 5）
packages/
  message-engine/      → 报文模型、解析、校验（Pydantic v2）✅ 已实现
  protocol-adapter/    → 协议适配器（HTTP/gRPC 等）
  assertion-engine/    → 断言规则引擎（JSONPath、XPath、正则）
  scheduler/           → 调度引擎（用例编排、执行）
  jmeter-bridge/       → JMeter 桥接层（报文 → .jmx → 执行 → 解析）
  reporter/            → 报告中心
infra/         → Docker + docker-compose 定义
docs/          → 仓库知识库
```

核心概念：
- **报文（Message/Form）**：测试用例的载体，通过 Pydantic v2 模型定义，包含请求数据、断言规则和预期响应
- **协议适配器**：实现 `connect → send(message) → receive → disconnect` 接口，先做 HTTP/REST 完整链路
- **JMeter 桥接层**：复用报文引擎的用例定义，生成 .jmx 文件执行压测，结果统一到平台报告格式
- **断言规则**：不感知传输细节，JSONPath/XPath/正则统一抽象

## 文档导航

AGENTS.md 是入口路由，具体知识在 docs/ 下：

| 文档 | 用途 |
|------|------|
| `docs/ARCHITECTURE.md` | 架构总览与模块边界 |
| `docs/PRODUCT_SENSE.md` | 产品判断原则 |
| `docs/LOCAL_DEVELOPMENT.md` | 本地开发环境搭建与命令 |
| `docs/REPO_COLLAB_GUIDE.md` | 仓库协作约定 |
| `docs/design-docs/core-beliefs.md` | Agent-first 工作原则 |
| `docs/HISTORY_GUIDE.md` | 变更记录规范 |
| `docs/PLANS_GUIDE.md` | 执行计划规范 |

## 已确认的技术栈

| 层 | 选型 | 说明 |
|----|------|------|
| 后端框架 | FastAPI | Python 3.12+，异步原生 |
| 数据校验 | Pydantic v2 | 报文模型的核心 |
| ORM | SQLAlchemy 2.0 async | 配套 Alembic 迁移 |
| 依赖管理 | uv | 包管理 + 项目管理一体化 |
| 任务队列 | 初期用 asyncio | 需持久化时升级为 arq + Redis |
| 测试框架 | pytest + pytest-asyncio + httpx | |
| 前端框架 | React 18+ + Vite | |
| UI 组件库 | Ant Design 5 | |
| 状态管理 | Zustand + TanStack Query | 全局状态 + 服务端状态互补 |
| 报文编辑器 | Monaco Editor | |
| HTTP 客户端 | axios + TanStack Query | |
| 前端包管理 | pnpm | |
| 数据库 | PostgreSQL + asyncpg | |
| 缓存 | Redis | |
| 容器化 | Docker + docker-compose | |

详细说明见 `docs/exec-plans/active/tech-stack-selection.md`

## 关键约定

- 文档、代码、配置同步更新，不依赖聊天记录传递知识
- 复杂任务先落 execution plan 到 `docs/exec-plans/`
- 完成的变更记入 `docs/histories/`
- CI 至少守住文档可读性和基础安全门禁
- 优先小而清晰的抽象，避免过度设计（YAGNI）
- 技术栈决策记录在 `docs/exec-plans/active/tech-stack-selection.md`，变更需同步更新
