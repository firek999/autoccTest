import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, Popconfirm, Space, Table, Tag, Typography, message } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { fetchTestCases, deleteTestCase } from "../services/testCases";
import type { TestCase } from "../types";

export function TestCaseListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleting, setDeleting] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["test-cases"],
    queryFn: fetchTestCases,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTestCase,
    onSuccess: () => {
      message.success("已删除");
      queryClient.invalidateQueries({ queryKey: ["test-cases"] });
      setDeleting(null);
    },
    onError: () => {
      message.error("删除失败");
      setDeleting(null);
    },
  });

  const columns = [
    {
      title: "名称",
      dataIndex: "name",
      key: "name",
      render: (name: string, record: TestCase) => (
        <Button type="link" onClick={() => navigate(`/test-cases/${record.id}`)}>{name}</Button>
      ),
    },
    {
      title: "协议",
      dataIndex: "protocol",
      key: "protocol",
      width: 100,
      render: (p: string) => <Tag color="blue">{p}</Tag>,
    },
    {
      title: "描述",
      dataIndex: "description",
      key: "description",
      ellipsis: true,
      render: (d: string | null) => d || "-",
    },
    {
      title: "创建时间",
      dataIndex: "created_at",
      key: "created_at",
      width: 200,
      render: (t: string) => new Date(t).toLocaleString("zh-CN"),
    },
    {
      title: "操作",
      key: "actions",
      width: 160,
      render: (_: unknown, record: TestCase) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => navigate(`/test-cases/${record.id}/edit`)}>
            编辑
          </Button>
          <Popconfirm
            title="确认删除"
            description={`确定删除「${record.name}」?`}
            onConfirm={() => {
              setDeleting(record.id);
              deleteMutation.mutate(record.id);
            }}
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button type="link" danger icon={<DeleteOutlined />} loading={deleting === record.id}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          测试用例
        </Typography.Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
            刷新
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate("/test-cases/new")}>
            新建用例
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={isLoading}
        locale={{ emptyText: isError ? "加载失败，请重试" : "暂无测试用例，点击「新建用例」创建" }}
        pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (total) => `共 ${total} 条` }}
      />
    </>
  );
}
