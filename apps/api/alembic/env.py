"""Alembic 迁移环境配置 — 异步 PostgreSQL 支持."""

import asyncio
from logging.config import fileConfig

from alembic import context
from sqlalchemy.ext.asyncio import create_async_engine

from src.config import settings
from src.models.base import Base

# 导入所有模型以确保 metadata 完整
import src.models.test_case  # noqa: F401
import src.models.execution_log  # noqa: F401

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """离线模式 — 生成 SQL 脚本而非直接执行."""
    url = config.get_main_option("sqlalchemy.url", settings.database_url)
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection):
    """在给定连接上执行迁移."""
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    """在线模式 — 连接数据库并执行迁移."""
    url = config.get_main_option("sqlalchemy.url", settings.database_url)
    connectable = create_async_engine(url)

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())
