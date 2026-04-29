"""AssertionRule 模型测试."""

import pytest

from src.models.assertion import AssertionOperator, AssertionRule, AssertionType


class TestAssertionType:
    def test_all_types(self):
        assert AssertionType.STATUS_CODE == "status_code"
        assert AssertionType.JSONPATH == "jsonpath"
        assert AssertionType.RESPONSE_TIME == "response_time"

    def test_all_operators(self):
        assert AssertionOperator.EQUALS == "eq"
        assert AssertionOperator.CONTAINS == "contains"
        assert AssertionOperator.MATCHES == "matches"
        assert AssertionOperator.EXISTS == "exists"


class TestAssertionRule:
    def test_status_code_assertion(self):
        rule = AssertionRule(type=AssertionType.STATUS_CODE, operator=AssertionOperator.EQUALS, expected=200)
        d = rule.model_dump()
        assert d["type"] == "status_code"
        assert d["operator"] == "eq"
        assert d["expected"] == 200

    def test_jsonpath_assertion(self):
        rule = AssertionRule(
            type=AssertionType.JSONPATH,
            operator=AssertionOperator.EQUALS,
            path="$.data.name",
            expected="张三",
            message="用户名不匹配",
        )
        assert rule.path == "$.data.name"
        assert rule.message == "用户名不匹配"

    def test_regex_assertion(self):
        rule = AssertionRule(
            type=AssertionType.REGEX,
            operator=AssertionOperator.MATCHES,
            expected=r"\d{4}-\d{2}-\d{2}",
        )
        assert rule.expected == r"\d{4}-\d{2}-\d{2}"

    def test_response_time_assertion(self):
        rule = AssertionRule(type=AssertionType.RESPONSE_TIME, operator=AssertionOperator.LTE, expected=500)
        assert rule.type == AssertionType.RESPONSE_TIME
        assert rule.operator == AssertionOperator.LTE

    def test_exists_assertion(self):
        rule = AssertionRule(type=AssertionType.JSONPATH, operator=AssertionOperator.EXISTS, path="$.data.id")
        assert rule.expected is None  # EXISTS 不需要 expected

    def test_serialize_and_deserialize(self):
        rule = AssertionRule(type=AssertionType.STATUS_CODE, operator=AssertionOperator.EQUALS, expected=200)
        json_str = rule.model_dump_json()
        restored = AssertionRule.model_validate_json(json_str)
        assert restored == rule

    def test_default_message_is_none(self):
        rule = AssertionRule(type=AssertionType.STATUS_CODE, operator=AssertionOperator.EQUALS, expected=200)
        assert rule.message is None
