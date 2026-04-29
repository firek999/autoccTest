"""模板变量引擎测试."""

import pytest

from src.models.request import HttpHeader, HttpMethod, HttpRequest
from src.template_engine import extract_variables, resolve_request, resolve_template


class TestExtractVariables:
    def test_single_variable(self):
        assert extract_variables("http://example.com/users/{{userId}}") == ["userId"]

    def test_multiple_variables(self):
        result = extract_variables("{{baseUrl}}/users/{{userId}}")
        assert result == ["baseUrl", "userId"]

    def test_no_variables(self):
        assert extract_variables("http://example.com/api") == []

    def test_duplicates_removed(self):
        result = extract_variables("{{id}}/items/{{id}}")
        assert result == ["id"]

    def test_empty_string(self):
        assert extract_variables("") == []


class TestResolveTemplate:
    def test_simple_replacement(self):
        result = resolve_template("http://{{host}}/api", {"host": "example.com"})
        assert result == "http://example.com/api"

    def test_multiple_replacements(self):
        result = resolve_template("{{proto}}://{{host}}:{{port}}", {"proto": "https", "host": "api.com", "port": 443})
        assert result == "https://api.com:443"

    def test_undefined_variable_nonstrict(self):
        """非严格模式：未定义变量保留原文."""
        result = resolve_template("http://{{host}}/api", {})
        assert result == "http://{{host}}/api"

    def test_undefined_variable_strict(self):
        """严格模式：未定义变量抛出 KeyError."""
        with pytest.raises(KeyError, match="变量 'host' 未在上下文中定义"):
            resolve_template("http://{{host}}/api", {}, strict=True)

    def test_no_template_in_string(self):
        result = resolve_template("plain text", {})
        assert result == "plain text"


class TestResolveRequest:
    def test_resolve_url(self):
        req = HttpRequest(url="http://{{host}}/api/{{version}}/users")
        resolved = resolve_request(req, {"host": "example.com", "version": "v1"})
        assert resolved.url == "http://example.com/api/v1/users"

    def test_resolve_headers(self):
        req = HttpRequest(
            url="http://example.com/api",
            headers=[HttpHeader(name="Authorization", value="Bearer {{token}}")],
        )
        resolved = resolve_request(req, {"token": "abc123"})
        assert resolved.headers[0].value == "Bearer abc123"

    def test_resolve_body_dict(self):
        req = HttpRequest(
            url="http://example.com/api",
            body={"username": "{{user}}", "password": "{{pass}}", "count": 5},
        )
        resolved = resolve_request(req, {"user": "admin", "pass": "secret"})
        assert resolved.body == {"username": "admin", "password": "secret", "count": 5}

    def test_resolve_query_params(self):
        req = HttpRequest(
            url="http://example.com/api",
            query_params={"page": "{{page}}", "size": "20"},
        )
        resolved = resolve_request(req, {"page": "1"})
        assert resolved.query_params == {"page": "1", "size": "20"}

    def test_original_not_mutated(self):
        req = HttpRequest(url="http://{{host}}/api")
        original_url = req.url
        resolve_request(req, {"host": "example.com"})
        assert req.url == original_url  # 原对象不变

    def test_nested_body_list(self):
        req = HttpRequest(
            url="http://example.com/api",
            body={"items": [{"name": "{{item1}}"}, {"name": "{{item2}}"}]},
        )
        resolved = resolve_request(req, {"item1": "a", "item2": "b"})
        assert resolved.body == {"items": [{"name": "a"}, {"name": "b"}]}

    def test_undefined_variable_in_body(self):
        req = HttpRequest(url="http://example.com/api", body={"key": "{{missing}}"})
        resolved = resolve_request(req, {})
        assert resolved.body == {"key": "{{missing}}"}  # 保留原文
