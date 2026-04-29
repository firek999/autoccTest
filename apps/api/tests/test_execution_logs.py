"""执行记录查询接口测试."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_list_execution_logs_empty(client: AsyncClient):
    """获取空执行记录列表."""
    resp = await client.get("/api/v1/execution-logs/")
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_get_execution_log_not_found(client: AsyncClient):
    """获取不存在的执行记录返回 404."""
    resp = await client.get("/api/v1/execution-logs/00000000-0000-0000-0000-000000000000")
    assert resp.status_code == 404
    assert "不存在" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_filter_execution_logs_by_test_case_id(client: AsyncClient):
    """按 test_case_id 筛选执行记录."""
    resp = await client.get("/api/v1/execution-logs/?test_case_id=00000000-0000-0000-0000-000000000000")
    assert resp.status_code == 200
    assert resp.json() == []
