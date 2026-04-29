"""数据库连接管理 — 惰性初始化引擎，避免导入时连接数据库."""

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from src.config import settings
from src.models.base import Base

_engine = None
_async_session = None


def _get_engine():
    """惰性获取数据库引擎（首次调用时创建）."""
    global _engine
    if _engine is None:
        _engine = create_async_engine(settings.database_url, echo=settings.debug)
    return _engine


def _get_async_session():
    """惰性获取会话工厂."""
    global _async_session
    if _async_session is None:
        _async_session = async_sessionmaker(_get_engine(), expire_on_commit=False)
    return _async_session


async def init_db() -> None:
    """应用启动时初始化数据库 — 开发阶段自动建表，生产环境应使用 Alembic 迁移."""
    async with _get_engine().begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def close_db() -> None:
    """应用关闭时释放数据库连接池."""
    global _engine
    if _engine is not None:
        await _engine.dispose()
        _engine = None


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI 依赖 — 每个请求获取独立的数据库会话."""
    async with _get_async_session()() as session:
        yield session
