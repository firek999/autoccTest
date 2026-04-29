# 本地开发说明

本文档覆盖 autoccTest 的本地开发环境搭建、日常命令和故障排除。

## 环境要求

| 工具 | 最低版本 | 用途 |
|------|----------|------|
| Docker | 24.0+ | 所有服务通过容器运行 |
| Docker Compose | 2.20+ | 多服务编排 |
| 宿主机 Python | 3.12+ | 仅用于 IDE 类型检查和本地调试（可选） |
| 宿主机 Node.js | 22+ | 仅用于 IDE 类型检查（可选） |
| 宿主机 pnpm | 9+ | 前端依赖管理（可选，Docker 内已包含） |

## 首次搭建

```bash
# 1. 复制环境变量模板，按需编辑
cp infra/docker/env/.env.example infra/docker/env/.env

# 2. 启动开发环境（首次会构建镜像，约 2-3 分钟）
docker compose -f infra/docker/compose.dev.yml up -d --build

# 3. 验证服务启动
# API 文档：http://localhost:28000/docs
# 管理台：  http://localhost:27345
# 健康检查：http://localhost:28000/health
```

## 日常命令

```bash
# 启动全部服务
docker compose -f infra/docker/compose.dev.yml up -d

# 按服务启动
docker compose -f infra/docker/compose.dev.yml up db redis -d   # 仅基础设施
docker compose -f infra/docker/compose.dev.yml up api -d        # 仅 API
docker compose -f infra/docker/compose.dev.yml up admin -d      # 仅前端

# 查看日志
docker compose -f infra/docker/compose.dev.yml logs -f api

# 重启服务（代码变更后，热重载已自动生效）
docker compose -f infra/docker/compose.dev.yml restart api

# 停止全部服务
docker compose -f infra/docker/compose.dev.yml down

# 机械验证（CI 级别检查）
docker compose -f infra/docker/compose.verify.yml up --build --abort-on-container-exit
```

## 服务端口

| 服务 | 宿主机端口 | 容器端口 | 说明 |
|------|:----------:|:--------:|------|
| admin（管理台） | 27345 | 5173 | Vite dev server |
| api（API 服务） | 28000 | 8000 | FastAPI / Uvicorn |
| db（PostgreSQL） | 25432 | 5432 | PostgreSQL 16 |
| redis（缓存） | 26379 | 6379 | Redis 7 |

## 宿主机直接运行（可选）

Docker 模式是默认和推荐方式。如果需要在宿主机直接运行进行调试：

### API 服务

```bash
cd apps/api
uv sync
uv run uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload
```

### 管理台

```bash
cd apps/admin
pnpm install
pnpm dev
```

> 宿主机模式下需自行启动 PostgreSQL 和 Redis，或通过 `docker compose -f infra/docker/compose.dev.yml up db redis -d` 仅启动基础设施。

## 数据库

### 连接

```bash
# 通过 Docker 容器连接
docker exec -it autocc-db psql -U autocc -d autocc_test
```

### 迁移

项目使用 Alembic 管理数据库迁移。迁移文件位于 `apps/api/migrations/`。

```bash
cd apps/api

# 生成迁移（基于 SQLAlchemy 模型变更自动检测）
uv run alembic revision --autogenerate -m "描述变更"

# 执行迁移
uv run alembic upgrade head

# 回滚一个版本
uv run alembic downgrade -1
```

### 新增初始化 SQL

将新增 SQL 文件放入 `infra/docker/postgres/init/`，文件按名称排序执行。对已有开发卷，需手动执行或重建卷：

```bash
# 重建开发卷（会丢失数据）
docker compose -f infra/docker/compose.dev.yml down -v
docker compose -f infra/docker/compose.dev.yml up -d --build db
```

## 质量门禁

每次提交前应在 Docker verify 模式下确认以下检查全部通过：

| 检查项 | 前端命令 | 后端命令 |
|--------|----------|----------|
| 类型检查 | `pnpm typecheck` | `uv run pyright src/` |
| Lint | `pnpm lint` | `uv run ruff check src/ tests/` |
| 构建 | `pnpm build` | — |
| 单测 | `pnpm test` | `uv run pytest -v` |
| 格式检查 | `pnpm format:check` | `uv run ruff format --check src/ tests/` |

## 故障排除

### 端口冲突

如果宿主机端口被占用，编辑 `infra/docker/env/.env` 设置自定义端口，或直接修改 `compose.dev.yml` 中的 `ports` 映射。

### 前端代理失败

Vite dev server 配置了 `/api` 代理转发到 API 服务。检查 `vite.config.ts` 中的 `VITE_API_BASE_URL` 确保与 API 服务端口一致。

### 数据库连接失败

```bash
# 确认 DB 容器健康
docker ps --filter name=autocc-db

# 重置数据库
docker compose -f infra/docker/compose.dev.yml down -v db
docker compose -f infra/docker/compose.dev.yml up -d db
```
