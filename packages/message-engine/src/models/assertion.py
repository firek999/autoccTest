"""断言规则模型."""

from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class AssertionType(str, Enum):
    """断言类型."""

    STATUS_CODE = "status_code"  # HTTP 状态码断言
    JSONPATH = "jsonpath"  # JSONPath 表达式断言
    XPATH = "xpath"  # XPath 表达式断言
    REGEX = "regex"  # 正则表达式断言
    RESPONSE_TIME = "response_time"  # 响应时间断言


class AssertionOperator(str, Enum):
    """断言比较操作符."""

    EQUALS = "eq"  # 等于
    NOT_EQUALS = "neq"  # 不等于
    CONTAINS = "contains"  # 包含
    GT = "gt"  # 大于
    LT = "lt"  # 小于
    GTE = "gte"  # 大于等于
    LTE = "lte"  # 小于等于
    MATCHES = "matches"  # 正则匹配
    EXISTS = "exists"  # 路径存在性


class AssertionRule(BaseModel):
    """单个断言规则 — 对应 test_cases.assertion_rules JSONB 数组中的元素.

    不同类型的断言使用字段组合不同：
    - status_code: operator + expected（忽略 path）
    - jsonpath/xpath: operator + path + expected
    - regex: operator=matches + expected（pattern）
    - response_time: operator + expected（毫秒数）
    """

    type: AssertionType
    operator: AssertionOperator
    path: str | None = Field(default=None, description="JSONPath / XPath 表达式")
    expected: Any | None = Field(default=None, description="期望值")
    message: str | None = Field(default=None, description="断言失败时的提示信息")
