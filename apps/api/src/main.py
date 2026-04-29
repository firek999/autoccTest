"""autoccTest API 服务入口."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.config import settings
from src.db import close_db, init_db
from src.routers import execution_logs, health, test_cases


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理 — 启动时初始化数据库，关闭时释放连接池."""
    await init_db()
    yield
    await close_db()


app = FastAPI(
    title="autoccTest API",
    description="自动化通用项目验收测试平台 API 服务",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(test_cases.router, prefix="/api/v1")
app.include_router(execution_logs.router, prefix="/api/v1")


@app.get("/")
async def root():
    """根路径，返回服务基本信息."""
    return {
        "service": "autoccTest API",
        "version": "0.1.0",
        "status": "running",
    }
