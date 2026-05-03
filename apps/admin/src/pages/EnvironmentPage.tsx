import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, Card, Col, Empty, Form, Input, Modal, Popconfirm, Row, Space, Spin, Tag, Typography, message } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { fetchEnvironments, createEnvironment, updateEnvironment, deleteEnvironment } from "../services/environments";
import type { Environment } from "../types";

export function EnvironmentPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Environment | null>(null);
  const [form] = Form.useForm();

  const { data: envs, isLoading } = useQuery({ queryKey: ["environments"], queryFn: fetchEnvironments });

  const createMutation = useMutation({
    mutationFn: createEnvironment,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["environments"] }); setModalOpen(false); message.success("已创建"); },
  });
  const updateMutation = useMutation({
    mutationFn: (p: { id: string; payload: Partial<Environment> }) => updateEnvironment(p.id, p.payload),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["environments"] }); setModalOpen(false); message.success("已更新"); },
  });

  const openCreate = () => { setEditing(null); form.resetFields(); form.setFieldsValue({ variables: {} }); setModalOpen(true); };
  const openEdit = (env: Environment) => { setEditing(env); form.setFieldsValue({ name: env.name, description: env.description, variables: env.variables || {} }); setModalOpen(true); };

  const handleFinish = (values: Record<string, unknown>) => {
    const payload = { name: values.name as string, description: values.description as string, variables: values.variables as Record<string, string> };
    if (editing) updateMutation.mutate({ id: editing.id, payload });
    else createMutation.mutate(payload);
  };

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>环境变量</Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新建环境</Button>
      </div>

      {isLoading ? <Spin /> : (
        <Row gutter={16}>
          {(envs ?? []).map((env) => (
            <Col span={8} key={env.id}>
              <Card
                title={env.name}
                extra={
                  <Space>
                    <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(env)} />
                    <Popconfirm title="确认删除" onConfirm={() => deleteEnvironment(env.id).then(() => queryClient.invalidateQueries({ queryKey: ["environments"] }))}>
                      <Button size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                  </Space>
                }
              >
                <Typography.Paragraph type="secondary">{env.description || "-"}</Typography.Paragraph>
                {Object.entries(env.variables || {}).map(([k, v]) => (
                  <Tag key={k}>{k}={v}</Tag>
                ))}
                {Object.keys(env.variables || {}).length === 0 && <Typography.Text type="secondary">暂无变量</Typography.Text>}
              </Card>
            </Col>
          ))}
          {(envs ?? []).length === 0 && <Col span={24}><Empty description="暂无环境配置" /></Col>}
        </Row>
      )}

      <Modal
        open={modalOpen}
        title={editing ? "编辑环境" : "新建环境"}
        onCancel={() => setModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleFinish} initialValues={{ variables: {} }}>
          <Form.Item name="name" label="环境名称" rules={[{ required: true }]}>
            <Input placeholder="例如: 开发环境、生产环境" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input placeholder="环境用途说明" />
          </Form.Item>
          <Form.Item label="变量配置" help="格式: KEY=VALUE，每行一个">
            <Form.Item name="variables" noStyle>
              <Input.TextArea
                rows={6}
                placeholder={"base_url=http://api:8000\ntoken=dev-secret-key"}
                onChange={(e) => {
                  const map: Record<string, string> = {};
                  e.target.value.split("\n").forEach((line) => {
                    const idx = line.indexOf("=");
                    if (idx > 0) map[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
                  });
                  form.setFieldsValue({ variables: map });
                }}
              />
            </Form.Item>
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={createMutation.isPending || updateMutation.isPending}>
              {editing ? "保存修改" : "创建环境"}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
