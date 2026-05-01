import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Button, Card, Col, Form, Input, Modal, Row, Select, Space, Spin, Typography } from "antd";
import { SaveOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import Editor from "@monaco-editor/react";
import { fetchTestCase, createTestCase, updateTestCase } from "../services/testCases";
import type { TestCaseCreate } from "../types";

const JSON_EDITOR_HEIGHT = 220;
const DEFAULT_MESSAGE_DEF = JSON.stringify({ method: "GET", url: "/", headers: {} }, null, 2);
const DEFAULT_ASSERTIONS = JSON.stringify([{ type: "status_code", expected: 200 }], null, 2);
const DEFAULT_VARIABLES = JSON.stringify([], null, 2);

interface Template {
  name: string;
  description: string;
  message_definition: object;
  assertion_rules: object[];
  variables: object[];
}

const TEMPLATES: Template[] = [
  {
    name: "GET 请求",
    description: "发送 GET 请求并检查状态码",
    message_definition: { method: "GET", url: "/", headers: {} },
    assertion_rules: [{ type: "status_code", expected: 200 }],
    variables: [],
  },
  {
    name: "POST JSON",
    description: "发送 POST 请求带 JSON body",
    message_definition: { method: "POST", url: "/api/endpoint", headers: { "Content-Type": "application/json" }, body: { key: "value" } },
    assertion_rules: [{ type: "status_code", expected: 201 }],
    variables: [],
  },
  {
    name: "健康检查",
    description: "GET /health 验证响应时间和状态码",
    message_definition: { method: "GET", url: "/health", headers: {} },
    assertion_rules: [{ type: "status_code", expected: 200 }, { type: "response_time", max_ms: 500 }],
    variables: [],
  },
  {
    name: "响应体正则匹配",
    description: "检查响应体是否包含特定文本",
    message_definition: { method: "GET", url: "/", headers: {} },
    assertion_rules: [{ type: "status_code", expected: 200 }, { type: "regex", pattern: "ok|success" }],
    variables: [],
  },
];

function applyTemplate(form: any, tpl: Template) {
  form.setFieldsValue({
    name: tpl.name,
    description: tpl.description,
    protocol: "HTTP",
    message_definition: JSON.stringify(tpl.message_definition, null, 2),
    assertion_rules: JSON.stringify(tpl.assertion_rules, null, 2),
    variables: JSON.stringify(tpl.variables, null, 2),
  });
}

/** Monaco JSON 编辑器 — 带实时 JSON 合法性指示器 */
function JsonEditorInput({
  value,
  onChange,
  height = JSON_EDITOR_HEIGHT,
}: {
  value?: string;
  onChange?: (v: string) => void;
  height?: number;
}) {
  const [local, setLocal] = useState(value ?? "");
  const [valid, setValid] = useState(true);

  useEffect(() => setLocal(value ?? ""), [value]);

  const handleChange = (v: string | undefined) => {
    const next = v ?? "";
    setLocal(next);
    try { JSON.parse(next); setValid(true); } catch { setValid(false); }
    onChange?.(next);
  };

  return (
    <div style={{ border: `1px solid ${valid ? "#d9d9d9" : "#ff4d4f"}`, borderRadius: 6, overflow: "hidden", position: "relative" }}>
      <Editor
        height={height}
        language="json"
        theme="vs"
        value={local}
        onChange={handleChange}
        options={{ minimap: { enabled: false }, fontSize: 13, scrollBeyondLastLine: false }}
      />
      <div style={{ position: "absolute", bottom: 4, right: 8, fontSize: 11, color: valid ? "#52c41a" : "#ff4d4f", background: "rgba(255,255,255,0.9)", padding: "0 4px", borderRadius: 3 }}>
        {valid ? "JSON ✓" : "JSON ✗"}
      </div>
    </div>
  );
}

export function TestCaseFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const cloneId = searchParams.get("clone");
  const [form] = Form.useForm();
  const [successOpen, setSuccessOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const isEdit = id && id !== "new";
  const isClone = !!cloneId;

  // 编辑模式 — 加载现有数据
  const { data: existing, isLoading: isLoadLoading } = useQuery({
    queryKey: ["test-case", isEdit ? id : cloneId],
    queryFn: () => fetchTestCase((isEdit ? id : cloneId)!),
    enabled: !!isEdit || isClone,
  });

  // 创建
  const createMutation = useMutation({
    mutationFn: createTestCase,
    onSuccess: () => setSuccessOpen(true),
    onError: () => setErrorMsg("创建失败，请重试"),
  });

  // 更新
  const updateMutation = useMutation({
    mutationFn: (payload: Parameters<typeof updateTestCase>[1]) => updateTestCase(id!, payload),
    onSuccess: () => setSuccessOpen(true),
    onError: () => setErrorMsg("更新失败，请重试"),
  });

  // 加载现有数据到表单
  useEffect(() => {
    if (existing) {
      form.setFieldsValue({
        name: isClone ? `${existing.name} (副本)` : existing.name,
        description: existing.description,
        protocol: existing.protocol,
        message_definition: JSON.stringify(existing.message_definition, null, 2),
        assertion_rules: JSON.stringify(existing.assertion_rules ?? [], null, 2),
        variables: JSON.stringify(existing.variables ?? [], null, 2),
        tags: existing.tags ?? [],
      });
    }
  }, [existing, form, isClone]);

  const handleFinish = (values: Record<string, string>) => {
    let message_definition: Record<string, unknown>;
    let assertion_rules: unknown[];
    let variables: unknown[];

    try {
      message_definition = JSON.parse(values.message_definition);
      assertion_rules = JSON.parse(values.assertion_rules || "[]");
      variables = JSON.parse(values.variables || "[]");
    } catch {
      setErrorMsg("JSON 格式错误：报文定义、断言规则和变量列表必须是合法的 JSON 格式");
      return;
    }

    const payload: TestCaseCreate = {
      name: values.name,
      description: values.description || null,
      protocol: values.protocol,
      message_definition,
      assertion_rules,
      variables,
      tags: values.tags || [],
    };

    if (isEdit) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  // Ctrl+S 快捷键保存
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        form.submit();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [form]);

  if (isEdit && isLoadLoading) {
    return <Spin size="large" style={{ display: "block", marginTop: 80 }} />;
  }

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/test-cases")}>
          返回
        </Button>
        <Typography.Title level={3} style={{ margin: 0 }}>
          {isClone ? `克隆用例: ${existing?.name ?? ""}` : isEdit ? `编辑用例: ${existing?.name ?? ""}` : "新建测试用例"}
        </Typography.Title>
      </div>

      {/* 模板选择器 — 仅新建时显示 */}
      {!isEdit && !isClone && (
        <div style={{ marginBottom: 24 }}>
          <Typography.Text type="secondary" style={{ marginBottom: 8, display: "block" }}>快速模板（点击填充基础结构）</Typography.Text>
          <Row gutter={12}>
            {TEMPLATES.map((tpl) => (
              <Col span={6} key={tpl.name}>
                <Card
                  size="small"
                  hoverable
                  onClick={() => applyTemplate(form, tpl)}
                  style={{ cursor: "pointer" }}
                >
                  <Typography.Text strong>{tpl.name}</Typography.Text>
                  <br />
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>{tpl.description}</Typography.Text>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      )}

      <Form form={form} layout="vertical" onFinish={handleFinish} initialValues={{
        protocol: "HTTP",
        message_definition: DEFAULT_MESSAGE_DEF,
        assertion_rules: DEFAULT_ASSERTIONS,
        variables: DEFAULT_VARIABLES,
        tags: [],
      }}>
        <Form.Item name="name" label="用例名称" rules={[{ required: true, message: "请输入用例名称" }]}>
          <Input placeholder="例如: 登录接口测试" maxLength={255} />
        </Form.Item>

        <Space style={{ width: "100%" }} size={16}>
          <Form.Item name="protocol" label="协议" rules={[{ required: true }]} style={{ width: 200 }}>
            <Select options={[{ value: "HTTP", label: "HTTP" }, { value: "gRPC", label: "gRPC" }, { value: "WebSocket", label: "WebSocket" }]} />
          </Form.Item>

          <Form.Item name="description" label="描述" style={{ flex: 1 }}>
            <Input.TextArea placeholder="用例用途说明（可选）" rows={2} />
          </Form.Item>
        </Space>

        <Form.Item name="message_definition" label="报文定义 (JSON)" rules={[{ required: true }]}>
          <JsonEditorInput />
        </Form.Item>

        <Form.Item name="assertion_rules" label="断言规则 (JSON)">
          <JsonEditorInput />
        </Form.Item>

        <Form.Item name="variables" label="变量列表 (JSON)">
          <JsonEditorInput />
        </Form.Item>

        <Form.Item name="tags" label="标签">
          <Select mode="tags" placeholder="输入标签后回车添加，如: 冒烟测试、回归测试" />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={isPending} size="large">
            {isEdit ? "保存修改" : "创建用例"}
          </Button>
        </Form.Item>
      </Form>

      {/* 保存成功弹窗 */}
      <Modal
        open={successOpen}
        onOk={() => navigate("/test-cases")}
        onCancel={() => setSuccessOpen(false)}
        okText="确定"
        cancelText="取消"
        closable
      >
        测试用例保存成功！
      </Modal>

      {/* 错误弹窗 */}
      <Modal
        open={errorMsg !== null}
        onOk={() => setErrorMsg(null)}
        onCancel={() => setErrorMsg(null)}
        okText="确定"
        cancelButtonProps={{ style: { display: "none" } }}
        closable
      >
        {errorMsg}
      </Modal>
    </>
  );
}
