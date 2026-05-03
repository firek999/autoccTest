import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { Button, Form, Input, Modal, Select, Space, Spin, Typography } from "antd";
import { SaveOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import { fetchSuite, createSuite, updateSuite } from "../services/suites";
import { fetchTestCases } from "../services/testCases";

export function SuiteFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [successOpen, setSuccessOpen] = useState(false);
  const isEdit = id && id !== "new";

  const { data: existing, isLoading } = useQuery({
    queryKey: ["suite", id], queryFn: () => fetchSuite(id!), enabled: !!isEdit,
  });

  const { data: allCases } = useQuery({ queryKey: ["test-cases"], queryFn: fetchTestCases });

  const createMutation = useMutation({
    mutationFn: createSuite,
    onSuccess: () => setSuccessOpen(true),
  });
  const updateMutation = useMutation({
    mutationFn: (p: Parameters<typeof updateSuite>[1]) => updateSuite(id!, p),
    onSuccess: () => setSuccessOpen(true),
  });

  useEffect(() => {
    if (existing) {
      form.setFieldsValue({
        name: existing.name, description: existing.description,
        test_case_ids: (existing.test_case_ids || []).filter((tcId: string) =>
          allCases?.some((c) => c.id === tcId)
        ),
      });
    }
  }, [existing, form, allCases]);

  const handleFinish = (values: Record<string, unknown>) => {
    const payload = { name: values.name as string, description: values.description as string, test_case_ids: values.test_case_ids as string[] };
    if (isEdit) updateMutation.mutate(payload);
    else createMutation.mutate(payload);
  };

  if (isEdit && isLoading) return <Spin size="large" style={{ display: "block", marginTop: 80 }} />;

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/suites")}>返回</Button>
        <Typography.Title level={3} style={{ margin: 0 }}>{isEdit ? `编辑: ${existing?.name ?? ""}` : "新建测试套件"}</Typography.Title>
      </div>
      <Form form={form} layout="vertical" onFinish={handleFinish}
        initialValues={{ name: "", description: "", test_case_ids: [] }}>
        <Form.Item name="name" label="套件名称" rules={[{ required: true, message: "请输入名称" }]}>
          <Input placeholder="例如: 核心回归套件" maxLength={255} />
        </Form.Item>
        <Form.Item name="description" label="描述">
          <Input.TextArea placeholder="套件用途说明" rows={2} />
        </Form.Item>
        <Form.Item name="test_case_ids" label="包含的测试用例">
          <Select mode="multiple" placeholder="选择用例" options={(allCases ?? []).map((c) => ({ value: c.id, label: c.name }))} />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={createMutation.isPending || updateMutation.isPending} size="large">
            {isEdit ? "保存修改" : "创建套件"}
          </Button>
        </Form.Item>
      </Form>
      <Modal open={successOpen} title="套件保存成功！" onOk={() => navigate("/suites")} onCancel={() => setSuccessOpen(false)} okText="确定" cancelText="取消" closable>
        套件已保存，点击确定返回列表
      </Modal>
    </>
  );
}
