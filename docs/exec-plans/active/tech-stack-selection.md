# 技术栈选型方案

## 目标

完成 autoccTest 0→1 阶段的全栈技术选型，形成可落地的项目骨架。

## 范围

- 包含：后端 Python 技术栈、前端 React 技术栈、数据库与缓存、开发环境与容器化
- 不包含：生产环境部署拓扑、高可用方案、监控告警体系、CI/CD pipeline 详细设计

## 背景

- 相关文档：`docs/ARCHITECTURE.md`、`docs/PRODUCT_SENSE.md`、`CLAUDE.md`
- 已知约束：
  - 后端限定 Python 3.12+ 生态（方案B）
  - 前端限定 React 18+ 生态
  - 数据库限定 PostgreSQL
  - 遵循 YAGNI，只选当前阶段需要的
  - 优先开源方案，避免供应商锁定
  - 先跑通 HTTP/REST 完整链路

---

## 一、后端技术栈

### 1.1 Web 框架：FastAPI

- **状态**：已确认
- **理由**：异步原生支持（asyncio），与 Pydantic v2 深度集成，自动生成 OpenAPI 文档。这些特性与"报文模型驱动测试"的产品理念高度契合——报文定义即是 API schema，断言规则即是响应校验逻辑

### 1.2 数据校验：Pydantic v2

- **状态**：已确认
- **理由**：报文模型是平台核心抽象。Pydantic v2 的 `Field` 校验、`model_validator`、序列化/反序列化能力天然适合定义请求报文和断言规则的结构。v2 重写为 Rust 内核（pydantic-core），性能比 v1 提升 5-50x

### 1.3 ORM：SQLAlchemy 2.0 (async)

- **推荐**：**SQLAlchemy 2.0 async**，不选 Prisma Client Python
- **理由**：
  - SQLAlchemy 2.0 的 async 模式（基于 asyncio + asyncpg）已十分成熟，Alembic 迁移工具无缝集成
  - Prisma Client Python 是第三方维护的 Prisma Engine Python 包装，增加额外 Rust Prisma Engine 二进制依赖，版本追赶 upstream 有延迟
  - 社区生态（文档、教程、排查）SQLAlchemy 远胜 Prisma Client Python
  - 弥补方案：SQLAlchemy 没有 Schema→TS type 的官方方案，可通过 `openapi-typescript` 从 FastAPI 的 OpenAPI schema 生成前端类型定义

### 1.4 异步任务

- **推荐**：**直接使用 asyncio + FastAPI BackgroundTasks**，不引入独立任务队列
- **理由**：
  - 0→1 阶段，测试执行是同步工作流（发送请求→等待响应→断言），asyncio 原生 I/O 并发即可覆盖
  - 当前场景下的"异步"主要是 I/O 等待（HTTP 请求、DB 读写），不需要跨进程任务分发
  - 如果未来出现"定时压测"、"批量排队执行"、"长时间任务需持久化进度"等需求，引入 **arq + Redis** 作为升级路径
  - 不选 Celery 的原因：需要额外维护 Celery worker 进程 + Redis broker + Flower 监控，0→1 阶段运维负担过重。Celery 解决的是跨进程任务分发，asyncio 解决的是 I/O 并发，当前仅需后者

### 1.5 数据库迁移：Alembic

- **状态**：已确认
- **理由**：SQLAlchemy 生态官方迁移工具，autogenerate 能力大幅减少手写 migration 的工作量

### 1.6 测试框架：pytest + pytest-asyncio + httpx

- **状态**：已确认
- **理由**：pytest 生态成熟，pytest-asyncio 支持 async 测试用例，httpx 可同步可异步兼容 FastAPI TestClient。补充：pytest-cov（覆盖率），pytest-xdist（并行测试，0→1 阶段可选）

### 1.7 依赖管理与项目脚手架：uv

- **推荐**：**uv**，不选 Poetry 或 pip-tools
- **理由**：
  - uv（由 Ruff 作者开发，Rust 实现）是目前最快的 Python 包管理工具，解析速度比 Poetry 快 10-100x
  - 兼容 pip 生态，可直接使用 pyproject.toml，支持 `uv add`/`uv sync`/`uv lock`/`uv build`/`uv run` 完整开发工作流
  - 不需要额外引入 Rye（实验性）或 Hatch（增加工具链复杂度）
  - 工具链极简：Python 3.12+ + uv 即可开始开发

---

## 二、前端技术栈

### 2.1 UI 框架：Ant Design 5

- **推荐**：**Ant Design 5**，不选 Mantine 7
- **理由**：
  - 管理后台场景天然选择：Table、Form、Modal、Tree、Tabs 等企业级组件开箱即用
  - 中文文档和社区资源丰富，排查成本低
  - v5 的 CSS-in-JS（cssinjs）在主题定制和按需加载方面比 v4 有本质提升
  - Token 级别主题变量方便后续品牌化
  - Mantine 7 同样优秀，但国内生态和第三方资源不如 Ant Design

### 2.2 状态管理：Zustand + TanStack Query

- **推荐**：**Zustand**（全局状态）+ **TanStack Query**（服务端状态），不选 Redux Toolkit
- **理由**：
  - 0→1 阶段的全局状态很少（当前用户信息、全局配置），Zustand 约 1KB 体积、零 boilerplate
  - Redux Toolkit 的 `createSlice`/`createAsyncThunk`/`configureStore` 链条对小型项目过于正式
  - 大部分页面级状态通过 TanStack Query 缓存 + URL params 管理，Zustand 只持有跨页面共享的轻量状态
  - 未来如果状态复杂度上升，Zustand 的 middleware 机制（immer、devtools、persist）仍可扩展

### 2.3 构建工具：Vite

- **状态**：已确认
- **理由**：ESM 原生开发服务器、HMR 毫秒级更新、Rollup 构建打包、TypeScript 开箱支持

### 2.4 报文编辑器：Monaco Editor

- **推荐**：**Monaco Editor**，不选 CodeMirror 6
- **理由**：
  - 报文编辑是平台最核心的交互场景，Monaco Editor 提供 VS Code 级编辑体验：语法高亮、自动补全、错误标记、diff 模式、代码折叠
  - JSON Schema 校验可直接集成到 Monaco 的标记系统，用户编辑报文时实时看到格式错误
  - CodeMirror 6 更轻量但同等功能下需要大量插件配置（语言支持、补全、linting 等）
  - 风险缓解：Monaco 包体积较大（约 5MB gzip），通过 Web Workers 异步加载 + Vite code splitting 优化。简单场景（短文报）可用原生 textarea + JSON 高亮，仅在复杂编辑时启用 Monaco

### 2.5 HTTP 客户端：axios + TanStack Query

- **状态**：已确认
- **分工**：
  - **axios**：请求/响应拦截器（统一 Authorization header、统一错误处理）、请求取消、上传进度
  - **TanStack Query**：服务端状态缓存、请求去重、后台刷新、乐观更新、分页/无限滚动
  - 不选"fetch + TanStack Query"的原因：fetch 响应拦截需手动封装，axios 的 interceptor API 成熟度更高

### 2.6 路由：React Router v6

- **状态**：已确认
- **理由**：React 生态事实标准路由方案。在 Ant Design 管理后台中保持 `URL → 页面组件` 的映射模式即可

### 2.7 包管理器：pnpm

- **推荐**：**pnpm**，不选 npm 或 yarn
- **理由**：硬链接机制节省磁盘（Monaco + Ant Design 体积大）、严格依赖隔离避免幽灵依赖、速度快于 npm 和 yarn classic

---

## 三、数据库与缓存

### 3.1 数据库：PostgreSQL

- **状态**：已确认
- **理由**：JSONB 字段支持（灵活存储报文定义和断言规则 Schema）、成熟异步驱动 asyncpg、GIN 索引适合 JSON 查询

### 3.2 连接池：asyncpg

- **状态**：已确认（SQLAlchemy async 模式默认驱动）
- 通过 `create_async_engine("postgresql+asyncpg://...")` 使用

### 3.3 缓存：Redis

- **状态**：已确认
- **理由**：会话缓存、运行时执行状态。未来 arq 升级时也作为任务队列 broker

---

## 四、开发环境

### 4.1 本地开发

```bash
# 后端
cd apps/api
uv sync                    # 安装依赖
uv run fastapi dev         # 启动开发服务器（热重载）

# 前端
cd apps/admin
pnpm install
pnpm dev                   # Vite 开发服务器

# 基础设施
docker compose up -d       # PostgreSQL + Redis
```

### 4.2 容器化

- **方案**：Docker + docker-compose
- **理由**：本地开发环境与 CI/CD 一致，团队新成员可复用

---

## 五、方案整体评价

| 维度 | 评价 |
|------|------|
| 一致性 | 后端 FastAPI + Pydantic v2 + SQLAlchemy async，前端 React Query + Zustand，两端异步优先 |
| 学习成本 | Ant Design 和 React Router 成熟技术，上手成本低；uv 是新工具但与 pip 兼容 |
| 性能保障 | asyncpg I/O 性能、Vite 构建性能、Monaco 编辑器性能，各层无瓶颈 |
| YAGNI 符合度 | 未引入 Celery、Redux、Prisma、分布式方案，全部等需要时再升级 |
| 风险点 | Monaco Editor 包体积（需 code splitting）、uv 较新（2024年推广，但前瞻性可接受） |

---

## 六、实施入口

1. repo 根目录创建 `pyproject.toml`，配置 project metadata 和依赖分组
2. `apps/api/` 创建 FastAPI 项目骨架
3. `apps/admin/` 创建 Vite + React + Ant Design 项目骨架
4. `docker-compose.yml` 定义 PostgreSQL + Redis 服务
5. 验证：后端启动成功 + 前端启动成功 + 前后端联调通

---

## 七、决策记录

- 2026-04-29：选择方案B（Python FastAPI + React），理由是报文模型与 Pydantic v2 天然匹配，开发周期最短
- 2026-04-29：选择 SQLAlchemy 2.0 async 而非 Prisma Client Python，理由是社区成熟度和减少额外系统依赖
- 2026-04-29：选择 asyncio + BackgroundTasks 而非 Celery/arq，理由是当前场景不需要跨进程任务分发
- 2026-04-29：选择 uv 作为依赖管理和项目管理工具，理由是极快速度和完整开发工作流支持
- 2026-04-29：选择 Zustand 而非 Redux Toolkit，理由是 0→1 阶段全局状态有限，Zustand 更轻
- 2026-04-29：选择 axios + TanStack Query 组合而非纯 fetch，理由是 axios 拦截器对企业级 API 通信更友好
- 2026-04-29：选择 Monaco Editor 而非 CodeMirror 6，理由是核心编辑场景需要完整的编辑器能力
- 2026-04-29：JMeter 桥接层选择 XML 生成方式而非 Java API，理由是避免引入 Java 运行时依赖

## 八、验证方式

- 后端：项目骨架创建后可运行 `uv run pytest` 验证测试框架可用
- 前端：项目骨架创建后可运行 `pnpm build` 验证构建成功
- 联调：前端成功通过 API 调用后端的 `/docs` OpenAPI 接口
