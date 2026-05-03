import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, Popconfirm, Space, Table, Tag, Typography, message } from "antd";
import { PlusOutlined, EyeOutlined, DeleteOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { fetchSuites, deleteSuite } from "../services/suites";
import type { Suite } from "../types";

export function SuiteListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["suites"], queryFn: fetchSuites });
  const deleteMutation = useMutation({
    mutationFn: deleteSuite,
    onSuccess: () => { message.success("已删除"); queryClient.invalidateQueries({ queryKey: ["suites"] }); },
  });

  const columns = [
    { title: "名称", dataIndex: "name", key: "name", render: (n: string, r: Suite) => <a onClick={() => navigate(`/suites/${r.id}`)}>{n}</a> },
    { title: "描述", dataIndex: "description", key: "description", ellipsis: true, render: (d: string | null) => d || "-" },
    { title: "用例数", key: "count", width: 80, render: (_: unknown, r: Suite) => <Tag>{(r.test_case_ids || []).length}</Tag> },
    { title: "创建时间", dataIndex: "created_at", key: "created_at", width: 180, render: (t: string) => new Date(t).toLocaleString("zh-CN") },
    {
      title: "操作", key: "actions", width: 140,
      render: (_: unknown, r: Suite) => (
        <Space>
          <Button type="link" icon={<EyeOutlined />} onClick={() => navigate(`/suites/${r.id}`)}>查看</Button>
          <Popconfirm title="确认删除" onConfirm={() => deleteMutation.mutate(r.id)} okText="删除" cancelText="取消" okButtonProps={{ danger: true }}>
            <Button type="link" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>测试套件</Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate("/suites/new")}>新建套件</Button>
      </div>
      <Table columns={columns} dataSource={data} rowKey="id" loading={isLoading}
        locale={{ emptyText: <div style={{ padding: 40 }}><Typography.Text type="secondary">暂无套件</Typography.Text><br /><Button type="primary" icon={<PlusOutlined />} onClick={() => navigate("/suites/new")} style={{ marginTop: 12 }}>新建第一个套件</Button></div> }}
        pagination={{ pageSize: 20 }} />
    </>
  );
}
