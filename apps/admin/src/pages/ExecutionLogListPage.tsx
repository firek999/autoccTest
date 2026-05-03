import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Button, Popconfirm, Select, Space, Table, Tag, Typography, message } from "antd";
import { ReloadOutlined, EyeOutlined, DeleteOutlined } from "@ant-design/icons";
import { apiClient } from "../services/api";
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
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["execution-logs"],
    queryFn: () => fetchExecutionLogs(),
  });

  const filteredData = data?.filter((l) =>
    statusFilter === "all" ? true : l.status === statusFilter
  );

  const columns = [
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (s: string) => <Tag color={STATUS_COLORS[s] ?? "default"}>{s}</Tag>,
    },
    {
      title: "场景名称",
      dataIndex: "test_case_name",
      key: "test_case_name",
      width: 180,
      ellipsis: true,
      render: (name: string, record: ExecutionLog) => (
        <a onClick={() => navigate(`/test-cases/${record.test_case_id}`)} style={{ cursor: "pointer" }}>{name}</a>
      ),
    },
    {
      title: "耗时",
      dataIndex: "duration_ms",
      key: "duration_ms",
      width: 100,
      sorter: (a: ExecutionLog, b: ExecutionLog) => (a.duration_ms ?? 0) - (b.duration_ms ?? 0),
      render: formatDuration,
    },
    {
      title: "开始时间",
      dataIndex: "started_at",
      key: "started_at",
      width: 180,
      sorter: (a: ExecutionLog, b: ExecutionLog) => (a.started_at || "").localeCompare(b.started_at || ""),
      render: (t: string | null) => (t ? new Date(t).toLocaleString("zh-CN") : "-"),
    },
    {
      title: "创建时间",
      dataIndex: "created_at",
      key: "created_at",
      width: 180,
      sorter: (a: ExecutionLog, b: ExecutionLog) => a.created_at.localeCompare(b.created_at),
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
        <Select
          value={statusFilter}
          onChange={setStatusFilter}
          style={{ width: 120 }}
          options={[
            { value: "all", label: "全部状态" },
            { value: "passed", label: "通过" },
            { value: "failed", label: "失败" },
            { value: "running", label: "执行中" },
          ]}
        />
        <Popconfirm title="清空所有执行记录?" onConfirm={async () => { await apiClient.delete("/execution-logs/clear"); refetch(); message.success("已清空"); }}>
          <Button danger icon={<DeleteOutlined />}>清空</Button>
        </Popconfirm>
        <Button icon={<ReloadOutlined />} onClick={() => refetch()}>刷新</Button>
      </div>

      <Table
        columns={columns}
        dataSource={filteredData}
        rowKey="id"
        loading={isLoading}
        locale={{
          emptyText: isError ? (
            <div style={{ padding: 40 }}><Typography.Text type="danger">加载失败</Typography.Text><br /><Button onClick={() => refetch()} style={{ marginTop: 8 }}>重试</Button></div>
          ) : (
            <div style={{ padding: 40 }}><Typography.Text type="secondary">暂无执行记录，去测试用例页执行测试</Typography.Text></div>
          ),
        }}
        pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (total) => `共 ${total} 条` }}
      />
    </>
  );
}
