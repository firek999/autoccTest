"""健康检查接口测试."""

import pytest
from httpx import ASGITransport, AsyncClient

from src.main import app


@pytest.fixture
async def client():
    """创建测试客户端."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


@pytest.mark.asyncio
async def test_root_returns_status(client: AsyncClient):
    """根路径返回服务状态."""
    resp = await client.get("/")
    assert resp.status_code == 200
    data = resp.json()
    assert data["service"] == "autoccTest API"
    assert data["status"] == "running"


@pytest.mark.asyncio
async def test_health_returns_healthy(client: AsyncClient):
    """健康检查返回 healthy."""
    resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "healthy"}
