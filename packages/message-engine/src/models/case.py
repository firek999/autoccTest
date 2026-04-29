"""报文用例聚合模型 — 平台的顶层抽象."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from src.models.request import HttpRequest, ProtocolType
from src.models.assertion import AssertionRule
from src.models.variable import Variable


class CaseMeta(BaseModel):
    """用例元信息 — 对应 test_cases 表的核心字段."""

    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    protocol: ProtocolType = ProtocolType.HTTP
    tags: list[str] = Field(default_factory=list)


class MessageCase(BaseModel):
    """完整报文测试用例 — 平台的顶层抽象.

    聚合了请求定义、断言规则和模板变量，
    可序列化为 JSON 存入数据库的 message_definition / assertion_rules / variables 字段。
    """

    id: UUID | None = None
    meta: CaseMeta
    request: HttpRequest = Field(description="请求报文定义")
    assertions: list[AssertionRule] = Field(default_factory=list, description="断言规则列表")
    variables: list[Variable] = Field(default_factory=list, description="模板变量定义列表")
    created_at: datetime | None = None
    updated_at: datetime | None = None

    def to_db_payload(self) -> dict:
        """转为数据库写入格式，拆分为三个 JSONB 字段."""
        return {
            "name": self.meta.name,
            "description": self.meta.description,
            "protocol": self.meta.protocol.value,
            "message_definition": self.request.model_dump(),
            "assertion_rules": [a.model_dump() for a in self.assertions],
            "variables": [v.model_dump() for v in self.variables],
        }
