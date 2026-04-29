"""测试执行引擎 — 发送 HTTP 请求，运行断言，记录执行日志."""

import json
import time
from datetime import datetime
from uuid import UUID

import httpx

from src.models.execution_log import ExecutionLog


async def execute_test_case(
    test_case_id: UUID,
    message_definition: dict,
    assertion_rules: list | None,
    variables: list | None,
    db_session,
) -> ExecutionLog:
    """执行单个测试用例：发送请求 → 运行断言 → 记录日志.

    Returns:
        已持久化的 ExecutionLog 记录.
    """
    # 1. 创建执行日志（pending 状态）
    log = ExecutionLog(
        test_case_id=test_case_id,
        status="running",
        started_at=datetime.now(),
    )
    db_session.add(log)
    await db_session.commit()

    try:
        # 2. 构建请求参数
        method = message_definition.get("method", "GET").upper()
        url = message_definition.get("url", "/")
        headers = message_definition.get("headers", {})
        body = message_definition.get("body")

        # 变量替换（简单模板：{{var_name}} → value）
        url = _apply_variables(url, variables)
        if body and isinstance(body, dict):
            body = _apply_variables_to_dict(body, variables)

        # 处理相对 URL：从 variables 中提取 base_url
        if not url.startswith("http"):
            base_url = _get_variable(variables, "base_url") or "http://localhost"
            url = base_url.rstrip("/") + "/" + url.lstrip("/")

        # 3. 发送 HTTP 请求
        start = time.perf_counter()
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.request(
                method=method,
                url=url,
                headers=headers,
                json=body if method in ("POST", "PUT", "PATCH") else None,
            )
        duration_ms = int((time.perf_counter() - start) * 1000)

        # 4. 解析响应
        try:
            response_data = response.json()
        except (json.JSONDecodeError, ValueError):
            response_data = {"_body": response.text}

        # 5. 运行断言
        assertion_results = _run_assertions(assertion_rules or [], response, response_data)
        all_passed = all(r.get("passed", False) for r in assertion_results)

        # 6. 更新执行日志
        log.status = "passed" if all_passed else "failed"
        log.request_data = {"method": method, "url": url, "headers": headers, "body": body}
        log.response_data = {
            "status_code": response.status_code,
            "headers": dict(response.headers),
            "body": response_data,
        }
        log.assertion_results = assertion_results
        log.duration_ms = duration_ms

    except httpx.TimeoutException:
        log.status = "failed"
        log.error_message = "请求超时（30s）"
        log.duration_ms = 30_000
    except httpx.ConnectError as e:
        log.status = "failed"
        log.error_message = f"连接失败: {e}"
    except Exception as e:
        log.status = "failed"
        log.error_message = f"执行异常: {type(e).__name__}: {e}"

    log.completed_at = datetime.now()
    await db_session.commit()
    await db_session.refresh(log)
    return log


def _get_variable(variables: list | None, name: str) -> str | None:
    """从变量列表中获取指定名称的值."""
    if not variables:
        return None
    for v in variables:
        if isinstance(v, dict) and v.get("name") == name:
            return v.get("value")
    return None


def _apply_variables(text: str, variables: list | None) -> str:
    """替换文本中的 {{var_name}} 模板变量."""
    if not variables:
        return text
    var_map = {v.get("name", ""): v.get("value", "") for v in variables if isinstance(v, dict)}
    for name, value in var_map.items():
        text = text.replace(f"{{{{{name}}}}}", str(value))
    return text


def _apply_variables_to_dict(data: dict, variables: list | None) -> dict:
    """递归替换 dict 中的模板变量."""
    if not variables:
        return data
    raw = json.dumps(data)
    raw = _apply_variables(raw, variables)
    return json.loads(raw)


def _run_assertions(rules: list, response, response_data: dict) -> list[dict]:
    """执行断言规则列表，返回带结果的规则列表.

    支持的断言类型:
        - status_code: 验证 HTTP 状态码
        - jsonpath:   验证 JSONPath 表达式（简单点号路径）
        - exists:     验证 JSON 字段存在性
    """
    results = []
    for rule in rules:
        rule_type = rule.get("type", "")
        result = {"rule": rule, "passed": False, "message": ""}

        try:
            if rule_type == "status_code":
                expected = rule.get("expected")
                actual = response.status_code
                result["passed"] = actual == expected
                result["message"] = f"status_code: {actual} == {expected}" if result["passed"] else f"status_code: {actual} != {expected}"

            elif rule_type == "jsonpath":
                path = rule.get("path", "$")
                exists = rule.get("exists", True)
                value = _jsonpath_get(response_data, path)
                if exists:
                    result["passed"] = value is not None
                    result["message"] = f"jsonpath {path}: {'存在' if result['passed'] else '不存在'}"
                else:
                    expected_val = rule.get("expected")
                    result["passed"] = value == expected_val
                    result["message"] = f"jsonpath {path}: {value} == {expected_val}"

            else:
                result["message"] = f"未知断言类型: {rule_type}"

        except Exception as e:
            result["message"] = f"断言执行异常: {e}"

        results.append(result)

    return results


def _jsonpath_get(data: dict, path: str):
    """简单的 JSONPath 点号路径取值（支持 $.token、$.data.id 等）."""
    if not path or path == "$":
        return data
    # 去掉开头的 $.
    if path.startswith("$."):
        path = path[2:]
    elif path.startswith("$"):
        path = path[1:]
    parts = [p for p in path.split(".") if p]
    current = data
    for part in parts:
        if isinstance(current, dict):
            current = current.get(part)
        elif isinstance(current, list):
            try:
                idx = int(part)
                current = current[idx]
            except (IndexError, ValueError):
                return None
        else:
            return None
        if current is None:
            return None
    return current
