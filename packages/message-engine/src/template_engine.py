"""模板变量引擎 — 提取与解析报文中的 {{variable}} 占位符."""

from __future__ import annotations

import re
from typing import Any

from src.models.request import HttpHeader, HttpRequest

# 匹配 {{variable_name}} 格式的模板变量
_VARIABLE_PATTERN = re.compile(r"\{\{(\w+)\}\}")


def extract_variables(template: str) -> list[str]:
    """从模板字符串中提取所有变量名，去重返回."""
    return list(dict.fromkeys(_VARIABLE_PATTERN.findall(template)))


def resolve_template(template: str, context: dict[str, Any], *, strict: bool = False) -> str:
    """解析模板字符串中的变量占位符，替换为 context 中的值.

    Args:
        template: 包含 {{variable}} 占位符的模板字符串.
        context: 变量名到值的映射.
        strict: True 时未定义变量抛出 KeyError，False 时保留原文.

    Returns:
        替换后的字符串.

    Raises:
        KeyError: strict=True 且变量未定义时.
    """

    def _replacer(match: re.Match) -> str:
        name = match.group(1)
        if name in context:
            return str(context[name])
        if strict:
            raise KeyError(f"变量 '{name}' 未在上下文中定义")
        return match.group(0)

    return _VARIABLE_PATTERN.sub(_replacer, template)


def resolve_request(request: HttpRequest, context: dict[str, Any], *, strict: bool = False) -> HttpRequest:
    """解析 HttpRequest 中所有模板变量.

    处理 url、headers、body、query_params 中的 {{variable}}.
    返回新实例，不修改原对象.
    """
    resolved_headers = [
        HttpHeader(name=h.name, value=resolve_template(h.value, context, strict=strict)) for h in request.headers
    ]

    resolved_query: dict[str, str] | None = None
    if request.query_params:
        resolved_query = {k: resolve_template(v, context, strict=strict) for k, v in request.query_params.items()}

    return HttpRequest(
        method=request.method,
        url=resolve_template(request.url, context, strict=strict),
        headers=resolved_headers,
        content_type=request.content_type,
        body=_resolve_body(request.body, context, strict),
        query_params=resolved_query,
    )


def _resolve_body(body: Any, context: dict[str, Any], strict: bool) -> Any:
    """递归解析 body 中的模板变量 — 支持 str / dict / list."""
    if body is None:
        return None
    if isinstance(body, str):
        return resolve_template(body, context, strict=strict)
    if isinstance(body, dict):
        return {k: _resolve_body(v, context, strict) for k, v in body.items()}
    if isinstance(body, list):
        return [_resolve_body(item, context, strict) for item in body]
    return body
