"""MessageCase 聚合模型测试."""

from src.models.case import CaseMeta, MessageCase
from src.models.request import HttpRequest, ProtocolType
from src.models.assertion import AssertionOperator, AssertionRule, AssertionType
from src.models.variable import Variable


class TestCaseMeta:
    def test_minimal_meta(self):
        meta = CaseMeta(name="测试用例1")
        assert meta.name == "测试用例1"
        assert meta.protocol == ProtocolType.HTTP
        assert meta.tags == []

    def test_full_meta(self):
        meta = CaseMeta(name="用户登录", description="验证登录接口", protocol=ProtocolType.HTTP, tags=["smoke", "login"])
        assert len(meta.tags) == 2

    def test_name_too_short(self):
        import pytest
        from pydantic import ValidationError

        with pytest.raises(ValidationError):
            CaseMeta(name="")


class TestMessageCase:
    def test_minimal_case(self):
        case = MessageCase(
            meta=CaseMeta(name="最小用例"),
            request=HttpRequest(url="http://example.com/api"),
        )
        assert case.assertions == []
        assert case.variables == []

    def test_full_case(self):
        case = MessageCase(
            meta=CaseMeta(name="登录测试", description="验证POST /login", tags=["smoke"]),
            request=HttpRequest(
                method="POST",
                url="http://example.com/login",
                headers=[{"name": "Content-Type", "value": "application/json"}],
                body={"username": "{{user}}", "password": "{{pass}}"},
            ),
            assertions=[
                AssertionRule(type=AssertionType.STATUS_CODE, operator=AssertionOperator.EQUALS, expected=200),
                AssertionRule(
                    type=AssertionType.JSONPATH,
                    operator=AssertionOperator.EQUALS,
                    path="$.token",
                    expected="{{token}}",
                ),
            ],
            variables=[Variable(name="user", values=["admin"]), Variable(name="pass", default="123456")],
        )
        assert len(case.assertions) == 2
        assert len(case.variables) == 2

    def test_to_db_payload(self):
        case = MessageCase(
            meta=CaseMeta(name="DB测试"),
            request=HttpRequest(url="http://example.com/api"),
            assertions=[AssertionRule(type=AssertionType.STATUS_CODE, operator=AssertionOperator.EQUALS, expected=200)],
        )
        payload = case.to_db_payload()
        assert payload["name"] == "DB测试"
        assert payload["protocol"] == "HTTP"
        assert isinstance(payload["message_definition"], dict)
        assert len(payload["assertion_rules"]) == 1

    def test_json_roundtrip(self):
        """验证 MessageCase 可完整序列化/反序列化."""
        original = MessageCase(
            meta=CaseMeta(name="往返测试"),
            request=HttpRequest(method="GET", url="http://example.com/api"),
            assertions=[AssertionRule(type=AssertionType.STATUS_CODE, operator=AssertionOperator.EQUALS, expected=200)],
            variables=[Variable(name="id", values=[1, 2])],
        )
        json_str = original.model_dump_json()
        restored = MessageCase.model_validate_json(json_str)
        assert restored.meta.name == original.meta.name
        assert restored.request.url == original.request.url
        assert len(restored.assertions) == 1
        assert len(restored.variables) == 1
