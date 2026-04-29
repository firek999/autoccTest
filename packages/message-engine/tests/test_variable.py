"""Variable 模型测试."""

from src.models.variable import Variable, VariableSource


class TestVariableSource:
    def test_all_sources(self):
        assert VariableSource.INLINE == "inline"
        assert VariableSource.CSV == "csv"
        assert VariableSource.FUNCTION == "function"


class TestVariable:
    def test_minimal_inline_variable(self):
        v = Variable(name="userId")
        assert v.name == "userId"
        assert v.type == "string"
        assert v.source == VariableSource.INLINE
        assert v.default is None

    def test_inline_variable_with_values(self):
        v = Variable(name="userId", values=["001", "002", "003"])
        assert v.values == ["001", "002", "003"]

    def test_csv_variable(self):
        v = Variable(name="user", source=VariableSource.CSV, csv_path="/data/users.csv")
        assert v.source == VariableSource.CSV
        assert v.csv_path == "/data/users.csv"

    def test_function_variable(self):
        v = Variable(name="timestamp", source=VariableSource.FUNCTION, function_name="randomInt")
        assert v.function_name == "randomInt"

    def test_default_fallback(self):
        v = Variable(name="page", default=1)
        assert v.default == 1

    def test_boolean_type(self):
        v = Variable(name="enabled", type="boolean", default=False)
        assert v.type == "boolean"
        assert v.default is False

    def test_serialize(self):
        v = Variable(name="userId", type="number", source=VariableSource.INLINE, values=[1, 2, 3])
        d = v.model_dump()
        assert d["name"] == "userId"
        assert d["type"] == "number"
        assert d["values"] == [1, 2, 3]
