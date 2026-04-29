"""模板变量模型."""

from enum import Enum
from typing import Any, Literal

from pydantic import BaseModel, Field


class VariableSource(str, Enum):
    """变量数据来源."""

    INLINE = "inline"  # 直接在定义中列出值列表
    CSV = "csv"  # 从 CSV 文件读取
    FUNCTION = "function"  # 内置函数生成（如 {{$randomInt(1,100)}}）


class Variable(BaseModel):
    """模板变量定义 — 对应 test_cases.variables JSONB 数组中的元素.

    变量名对应请求报文中 `{{variable_name}}` 的占位符。
    执行时由模板引擎按 source 类型解析为实际值。
    """

    name: str = Field(description="变量名，对应模板中的 {{name}}")
    type: Literal["string", "number", "boolean"] = "string"
    source: VariableSource = VariableSource.INLINE
    default: Any | None = Field(default=None, description="默认值")
    values: list[Any] | None = Field(default=None, description="INLINE 模式的值列表")
    csv_path: str | None = Field(default=None, description="CSV 模式的文件路径")
    function_name: str | None = Field(default=None, description="FUNCTION 模式的内置函数名")
