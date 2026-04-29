"""应用配置，从环境变量加载."""

import os


class Settings:
    """全局配置，所有值从环境变量读取，提供合理默认值."""

    # 服务
    app_name: str = os.getenv("APP_NAME", "autoccTest API")
    debug: bool = os.getenv("DEBUG", "false").lower() == "true"

    # 数据库
    database_url: str = os.getenv(
        "DATABASE_URL",
        "postgresql+asyncpg://autocc:autocc@db:5432/autocc_test",
    )

    # Redis
    redis_url: str = os.getenv("REDIS_URL", "redis://redis:6379/0")

    # CORS
    cors_origins: list[str] = os.getenv("CORS_ORIGINS", "http://localhost:27345").split(",")

    # 安全
    secret_key: str = os.getenv("API_SECRET_KEY", "dev-secret-change-in-production")


settings = Settings()
