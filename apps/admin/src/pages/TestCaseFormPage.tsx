import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { Button, Form, Input, Modal, Select, Space, Spin, Typography } from "antd";
import { SaveOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import Editor from "@monaco-editor/react";
import { fetchTestCase, createTestCase, updateTestCase } from "../services/testCases";
import type { TestCaseCreate } from "../types";

const JSON_EDITOR_HEIGHT = 220;
const DEFAULT_MESSAGE_DEF = JSON.stringify({ method: "GET", url: "/", headers: {} }, null, 2);
const DEFAULT_ASSERTIONS = JSON.stringify([{ type: "status_code", expected: 200 }], null, 2);
const DEFAULT_VARIABLES = JSON.stringify([], null, 2);

/** Monaco JSON 编辑器 — 作为 Form.Item 受控子组件，每次变更都同步到表单 */
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

  // 外部表单值变更时同步到编辑器
  useEffect(() => {
    setLocal(value ?? "");
  }, [value]);

  const handleChange = (v: string | undefined) => {
    const next = v ?? "";
    setLocal(next);
    // 每次变更都同步回表单，确保提交时表单值是编辑器中最新的内容
    onChange?.(next);
  };

  return (
    <div style={{ border: "1px solid #d9d9d9", borderRadius: 6, overflow: "hidden" }}>
      <Editor
        height={height}
        language="json"
        theme="vs"
        value={local}
        onChange={handleChange}
        options={{ minimap: { enabled: false }, fontSize: 13, scrollBeyondLastLine: false }}
      />
    </div>
  );
}

export function TestCaseFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [successOpen, setSuccessOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const isEdit = id && id !== "new";

  // 编辑模式 — 加载现有数据
  const { data: existing, isLoading: isLoadLoading } = useQuery({
    queryKey: ["test-case", id],
    queryFn: () => fetchTestCase(id!),
    enabled: !!isEdit,
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
        name: existing.name,
        description: existing.description,
        protocol: existing.protocol,
        message_definition: JSON.stringify(existing.message_definition, null, 2),
        assertion_rules: JSON.stringify(existing.assertion_rules ?? [], null, 2),
        variables: JSON.stringify(existing.variables ?? [], null, 2),
      });
    }
  }, [existing, form]);

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
    };

    if (isEdit) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

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
          {isEdit ? `编辑用例: ${existing?.name ?? ""}` : "新建测试用例"}
        </Typography.Title>
      </div>

      <Form form={form} layout="vertical" onFinish={handleFinish} initialValues={{
        protocol: "HTTP",
        message_definition: DEFAULT_MESSAGE_DEF,
        assertion_rules: DEFAULT_ASSERTIONS,
        variables: DEFAULT_VARIABLES,
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
