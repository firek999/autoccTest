"""HttpRequest 模型测试."""

import pytest
from pydantic import ValidationError

from src.models.request import ContentType, HttpHeader, HttpMethod, HttpRequest, ProtocolType


class TestHttpMethod:
    def test_all_methods_defined(self):
        assert HttpMethod.GET == "GET"
        assert HttpMethod.POST == "POST"
        assert HttpMethod.PUT == "PUT"
        assert HttpMethod.DELETE == "DELETE"


class TestHttpRequest:
    def test_minimal_request(self):
        req = HttpRequest(url="http://example.com/api")
        assert req.method == HttpMethod.POST
        assert req.url == "http://example.com/api"
        assert req.content_type == ContentType.JSON
        assert req.headers == []
        assert req.body is None

    def test_full_request(self):
        req = HttpRequest(
            method=HttpMethod.GET,
            url="http://example.com/users",
            headers=[HttpHeader(name="Authorization", value="Bearer {{token}}")],
            query_params={"page": "1"},
        )
        assert req.method == HttpMethod.GET
        assert len(req.headers) == 1
        assert req.headers[0].name == "Authorization"
        assert req.query_params == {"page": "1"}

    def test_json_body(self):
        req = HttpRequest(
            url="http://example.com/api",
            body={"name": "test", "value": 123},
        )
        assert req.body == {"name": "test", "value": 123}

    def test_url_is_required(self):
        with pytest.raises(ValidationError):
            HttpRequest()

    def test_template_variable_in_url(self):
        req = HttpRequest(url="http://example.com/users/{{userId}}")
        assert "{{userId}}" in req.url

    def test_serialize_to_dict(self):
        req = HttpRequest(
            method=HttpMethod.POST,
            url="http://example.com/api",
            headers=[HttpHeader(name="Content-Type", value="application/json")],
            body={"key": "value"},
        )
        d = req.model_dump()
        assert d["method"] == "POST"
        assert d["url"] == "http://example.com/api"
        assert d["body"] == {"key": "value"}

    def test_protocol_type_enum(self):
        assert ProtocolType.HTTP == "HTTP"
