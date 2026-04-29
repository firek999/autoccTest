import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Button, Table, Tag, Typography } from "antd";
import { ReloadOutlined, EyeOutlined } from "@ant-design/icons";
import { fetchExecutionLogs } from "../services/executionLogs";
import type { ExecutionLog } from "../types";

const STATUS_COLORS: Record<string, string> = {
  pending: "default",
  running: "processing",
  passed: "success",
  failed: "error",
};

function formatDuration(ms: number | null): string {
  if (ms == null) return "-";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function ExecutionLogListPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["execution-logs"],
    queryFn: () => fetchExecutionLogs(),
  });

  const columns = [
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (s: string) => <Tag color={STATUS_COLORS[s] ?? "default"}>{s}</Tag>,
    },
    {
      title: "用例 ID",
      dataIndex: "test_case_id",
      key: "test_case_id",
      width: 120,
      ellipsis: true,
      render: (id: string) => <Typography.Text copyable={{ text: id }}>{id.slice(0, 8)}...</Typography.Text>,
    },
    {
      title: "耗时",
      dataIndex: "duration_ms",
      key: "duration_ms",
      width: 100,
      render: formatDuration,
    },
    {
      title: "开始时间",
      dataIndex: "started_at",
      key: "started_at",
      width: 180,
      render: (t: string | null) => (t ? new Date(t).toLocaleString("zh-CN") : "-"),
    },
    {
      title: "错误信息",
      dataIndex: "error_message",
      key: "error_message",
      ellipsis: true,
      render: (e: string | null) => e || "-",
    },
    {
      title: "创建时间",
      dataIndex: "created_at",
      key: "created_at",
      width: 180,
      render: (t: string) => new Date(t).toLocaleString("zh-CN"),
    },
    {
      title: "操作",
      key: "actions",
      width: 80,
      render: (_: unknown, record: ExecutionLog) => (
        <Button type="link" icon={<EyeOutlined />} onClick={() => navigate(`/execution-logs/${record.id}`)}>
          查看
        </Button>
      ),
    },
  ];

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          执行记录
        </Typography.Title>
        <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
          刷新
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={isLoading}
        locale={{ emptyText: isError ? "加载失败，请重试" : "暂无执行记录" }}
        pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (total) => `共 ${total} 条` }}
      />
    </>
  );
}
