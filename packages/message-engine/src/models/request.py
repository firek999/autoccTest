"""HTTP 报文请求模型."""

from enum import Enum

from pydantic import BaseModel, Field


class ProtocolType(str, Enum):
    """被测系统协议类型."""

    HTTP = "HTTP"


class HttpMethod(str, Enum):
    """HTTP 请求方法."""

    GET = "GET"
    POST = "POST"
    PUT = "PUT"
    DELETE = "DELETE"
    PATCH = "PATCH"


class ContentType(str, Enum):
    """HTTP 请求内容类型."""

    JSON = "application/json"
    FORM = "application/x-www-form-urlencoded"
    XML = "application/xml"


class HttpHeader(BaseModel):
    """HTTP 请求头键值对."""

    name: str
    value: str


class HttpRequest(BaseModel):
    """HTTP 报文请求定义 — 对应 test_cases.message_definition JSONB 字段.

    url 和 body 中的 `{{variable}}` 模板变量在执行时由模板引擎解析.
    """

    method: HttpMethod = HttpMethod.POST
    url: str = Field(description="请求 URL，支持 {{variable}} 模板变量")
    headers: list[HttpHeader] = Field(default_factory=list)
    content_type: ContentType = ContentType.JSON
    body: dict | str | None = Field(default=None, description="JSON body 用 dict，XML/文本用 str")
    query_params: dict[str, str] | None = Field(default=None)
