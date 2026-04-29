# 路线A 人工验收清单

项目骨架搭建阶段验收，覆盖环境启动、服务可用性、Docker 配置正确性。

---

## 一、环境启动

### 1.1 Docker 环境

- [ ] 执行 `docker compose -f infra/docker/compose.dev.yml up -d --build` 成功，无报错退出
- [ ] 四个容器全部 Running：`docker ps --filter "name=autocc"`
  ```
  autocc-db      Running / Healthy
  autocc-redis   Running / Healthy
  autocc-api     Running
  autocc-admin   Running
  ```

### 1.2 端口可访问

- [ ] `localhost:25432` — PostgreSQL 可连接
- [ ] `localhost:26379` — Redis 可连接
- [ ] `localhost:28000` — API 服务可访问
- [ ] `localhost:27345` — 管理台可访问

---

## 二、API 服务

### 2.1 基础端点

- [ ] `GET http://localhost:28000/` 返回
  ```json
  {"service":"autoccTest API","version":"0.1.0","status":"running"}
  ```
- [ ] `GET http://localhost:28000/health` 返回
  ```json
  {"status":"healthy"}
  ```

### 2.2 OpenAPI 文档

- [ ] `http://localhost:28000/docs` 浏览器打开，Swagger UI 正常渲染
- [ ] 页面显示 `health` 标签和 `/health` 端点
- [ ] 点击 "Try it out" → "Execute" 能成功调用

### 2.3 热重载

- [ ] 修改 `apps/api/src/main.py` 中 `version` 字段为 `"0.1.1"`
- [ ] 无需重启容器，等待 2-3 秒后 `GET /` 返回新版本号
- [ ] 恢复为 `"0.1.0"`，再次确认生效

---

## 三、管理台前端

### 3.1 页面加载

- [ ] `http://localhost:27345` 浏览器打开
- [ ] 页面标题显示"autoccTest — 自动化验收测试平台"
- [ ] 左侧/顶部有导航，显示"autoccTest"文字和"概览"菜单项

### 3.2 内容渲染

- [ ] 页面中央显示四个统计卡片：
  - 测试用例总数（值=0）
  - 执行通过（值=0）
  - 待执行（值=0）
  - 压测任务（值=0）

### 3.3 HMR 热重载

- [ ] 修改 `apps/admin/src/pages/DashboardPage.tsx`，将"验收测试概览"改为"验收测试仪表盘"
- [ ] 浏览器页面无需手动刷新，自动更新标题
- [ ] 恢复原标题

---

## 四、数据库

### 4.1 连接

- [ ] 执行以下命令可成功连接数据库：
  ```bash
  docker exec autocc-db psql -U autocc -d autocc_test
  ```

### 4.2 表结构

- [ ] `\dt` 显示两张表：`test_cases` 和 `execution_logs`
- [ ] `\d test_cases` 包含以下字段：
  ```
  id (UUID, PK)
  name (VARCHAR 255, NOT NULL)
  description (TEXT)
  protocol (VARCHAR 50, NOT NULL, DEFAULT 'HTTP')
  message_definition (JSONB, NOT NULL)
  assertion_rules (JSONB)
  variables (JSONB)
  created_at (TIMESTAMPTZ)
  updated_at (TIMESTAMPTZ)
  ```
- [ ] `\d execution_logs` 包含以下字段：
  ```
  id (UUID, PK)
  test_case_id (UUID, FK → test_cases, ON DELETE CASCADE)
  status (VARCHAR 50, NOT NULL, DEFAULT 'pending')
  request_data (JSONB)
  response_data (JSONB)
  assertion_results (JSONB)
  started_at (TIMESTAMPTZ)
  completed_at (TIMESTAMPTZ)
  duration_ms (INTEGER)
  error_message (TEXT)
  created_at (TIMESTAMPTZ)
  ```

### 4.3 数据持久化

- [ ] 插入一条测试数据，然后执行 `docker compose down` 再 `up -d db`，确认数据仍存在
- [ ] 执行 `docker compose down -v` 后重建，确认数据被清空且自动重新初始化

---

## 五、Redis 缓存

- [ ] 执行以下命令能连接并写入/读取：
  ```bash
  docker exec autocc-redis redis-cli PING  # → PONG
  docker exec autocc-redis redis-cli SET test "hello"
  docker exec autocc-redis redis-cli GET test  # → "hello"
  ```

---

## 六、Docker 配置卫生

### 6.1 环境变量

- [ ] `infra/docker/env/.env` 文件存在（从 `.env.example` 复制）
- [ ] `.gitignore` 已排除 `.env` 文件
- [ ] 修改 `.env` 中的 `POSTGRES_PASSWORD` 后重建容器，确认新密码生效

### 6.2 镜像版本

- [ ] 所有镜像使用固定版本标签，不使用 `latest`：
  ```
  postgres:16.4-alpine
  redis:7.4-alpine
  python:3.12-slim
  node:22-alpine
  uv:0.6.14
  pnpm:10.8.0
  ```

### 6.3 端口隔离

- [ ] 宿主机端口使用非标准映射，不与常见服务冲突：
  ```
  admin:    27345 → 5173
  api:      28000 → 8000
  db:       25432 → 5432
  redis:    26379 → 6379
  ```

---

## 七、文档完整性

- [ ] `CLAUDE.md` — 包含项目概述、技术栈、架构概览、命令、文档导航
- [ ] `docs/ARCHITECTURE.md` — 包含 7 个核心模块描述、两套数据流、存储模型
- [ ] `docs/PRODUCT_SENSE.md` — 包含核心用户、价值主张、质量优先级、取舍原则
- [ ] `docs/LOCAL_DEVELOPMENT.md` — 包含环境要求、首次搭建、日常命令、故障排除
- [ ] `docs/exec-plans/active/tech-stack-selection.md` — 包含全栈选型及决策记录
- [ ] `README.md` — 包含项目简介和快速开始命令

---

## 八、容器启停

- [ ] `docker compose -f infra/docker/compose.dev.yml down` 停止全部服务（数据卷保留）
- [ ] `docker compose -f infra/docker/compose.dev.yml up -d` 重新启动，服务恢复
- [ ] `docker compose -f infra/docker/compose.dev.yml down -v` 停止并删除数据卷（完全清空）

---

## 九、Verify 模式

- [ ] 执行 `docker compose -f infra/docker/compose.verify.yml up --build --abort-on-container-exit`
- [ ] api-verify 容器构建成功，输出 lint + typecheck + test 结果
- [ ] 当前 api-verify 的 pyright 和 pytest 全部通过（0 错误）
- [ ] admin-verify 构建可能失败（缺少 pnpm-lock.yaml），记录为已知问题

---

## 签字确认

| 角色 | 签字 | 日期 |
|------|------|------|
| 实施（AI Agent） | — | 2026-04-29 |
| 验收人 | | |
