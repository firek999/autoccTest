"""测试用例 Pydantic schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class TestCaseBase(BaseModel):
    """测试用例基础字段."""

    name: str = Field(..., min_length=1, max_length=255, description="用例名称")
    description: str | None = Field(None, description="用例描述")
    protocol: str = Field("HTTP", max_length=50, description="协议类型")
    message_definition: dict = Field(..., description="报文定义 (JSONB)")
    assertion_rules: list | None = Field(None, description="断言规则列表")
    variables: list | None = Field(None, description="变量列表")
    tags: list[str] | None = Field(None, description="标签列表")
    starred: bool = False
    archived: bool = False


class TestCaseCreate(TestCaseBase):
    """创建测试用例的请求体."""
    pass


class TestCaseUpdate(BaseModel):
    """更新测试用例的请求体 — 所有字段可选."""

    name: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    protocol: str | None = Field(None, max_length=50)
    message_definition: dict | None = None
    assertion_rules: list | None = None
    variables: list | None = None


class TestCaseResponse(TestCaseBase):
    """测试用例 API 响应."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    created_at: datetime
    updated_at: datetime
