"""测试用例 CRUD 接口测试."""

import pytest
from httpx import AsyncClient

SAMPLE_CASE = {
    "name": "登录接口测试",
    "description": "验证用户登录流程",
    "protocol": "HTTP",
    "message_definition": {
        "method": "POST",
        "url": "/api/login",
        "headers": {"Content-Type": "application/json"},
        "body": {"username": "admin", "password": "123456"},
    },
    "assertion_rules": [
        {"type": "status_code", "expected": 200},
        {"type": "jsonpath", "path": "$.token", "exists": True},
    ],
    "variables": [{"name": "base_url", "value": "http://localhost:8080"}],
}


@pytest.mark.asyncio
async def test_create_test_case(client: AsyncClient):
    """创建测试用例并验证返回."""
    resp = await client.post("/api/v1/test-cases/", json=SAMPLE_CASE)
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == SAMPLE_CASE["name"]
    assert data["protocol"] == "HTTP"
    assert "id" in data
    assert "created_at" in data


@pytest.mark.asyncio
async def test_list_test_cases(client: AsyncClient):
    """获取测试用例列表."""
    await client.post("/api/v1/test-cases/", json=SAMPLE_CASE)
    resp = await client.get("/api/v1/test-cases/")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) == 1


@pytest.mark.asyncio
async def test_get_test_case_by_id(client: AsyncClient):
    """按 ID 获取测试用例."""
    create_resp = await client.post("/api/v1/test-cases/", json=SAMPLE_CASE)
    case_id = create_resp.json()["id"]

    resp = await client.get(f"/api/v1/test-cases/{case_id}")
    assert resp.status_code == 200
    assert resp.json()["id"] == case_id


@pytest.mark.asyncio
async def test_get_test_case_not_found(client: AsyncClient):
    """获取不存在的测试用例返回 404."""
    resp = await client.get("/api/v1/test-cases/00000000-0000-0000-0000-000000000000")
    assert resp.status_code == 404
    assert "不存在" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_update_test_case(client: AsyncClient):
    """部分更新测试用例."""
    create_resp = await client.post("/api/v1/test-cases/", json=SAMPLE_CASE)
    case_id = create_resp.json()["id"]

    resp = await client.patch(f"/api/v1/test-cases/{case_id}", json={"name": "更新后的用例"})
    assert resp.status_code == 200
    assert resp.json()["name"] == "更新后的用例"
    assert resp.json()["description"] == SAMPLE_CASE["description"]  # 未变更


@pytest.mark.asyncio
async def test_delete_test_case(client: AsyncClient):
    """删除测试用例."""
    create_resp = await client.post("/api/v1/test-cases/", json=SAMPLE_CASE)
    case_id = create_resp.json()["id"]

    resp = await client.delete(f"/api/v1/test-cases/{case_id}")
    assert resp.status_code == 204

    # 再次获取验证已删除
    get_resp = await client.get(f"/api/v1/test-cases/{case_id}")
    assert get_resp.status_code == 404


@pytest.mark.asyncio
async def test_create_test_case_validation_error(client: AsyncClient):
    """缺少必填字段时返回 422."""
    resp = await client.post("/api/v1/test-cases/", json={"name": "缺少报文定义"})
    assert resp.status_code == 422
