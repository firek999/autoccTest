import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { Alert, Button, Descriptions, Popconfirm, Space, Spin, Table, Tag, Typography, message } from "antd";
import { EditOutlined, DeleteOutlined, ArrowLeftOutlined, PlayCircleOutlined, EyeOutlined, CopyOutlined } from "@ant-design/icons";
import { fetchTestCase, deleteTestCase, executeTestCase } from "../services/testCases";
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

export function TestCaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [execResult, setExecResult] = useState<ExecutionLog | null>(null);

  const { data: testCase, isLoading, isError } = useQuery({
    queryKey: ["test-case", id],
    queryFn: () => fetchTestCase(id!),
    enabled: !!id,
  });

  // 执行历史
  const { data: history } = useQuery({
    queryKey: ["execution-logs", id],
    queryFn: () => fetchExecutionLogs(id!),
    enabled: !!id,
    refetchInterval: 10_000,
  });

  const executeMutation = useMutation({
    mutationFn: () => executeTestCase(id!),
    onSuccess: (data) => {
      setExecResult(data);
      queryClient.invalidateQueries({ queryKey: ["execution-logs", id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
    onError: () => message.error("执行失败"),
  });

  const handleDelete = async () => {
    try {
      await deleteTestCase(id!);
      message.success("已删除");
      navigate("/test-cases");
    } catch {
      message.error("删除失败");
    }
  };

  if (isLoading) return <Spin size="large" style={{ display: "block", marginTop: 80 }} />;
  if (isError || !testCase) return <Typography.Text type="danger">加载失败，测试用例不存在</Typography.Text>;

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/test-cases")}>返回列表</Button>
          <Typography.Title level={3} style={{ margin: 0 }}>{testCase.name}</Typography.Title>
        </Space>
        <Space>
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            loading={executeMutation.isPending}
            onClick={() => executeMutation.mutate()}
          >
            执行
          </Button>
          <Button icon={<CopyOutlined />} onClick={() => navigate(`/test-cases/new?clone=${id}`)}>克隆</Button>
          <Button icon={<EditOutlined />} onClick={() => navigate(`/test-cases/${id}/edit`)}>编辑</Button>
          <Popconfirm
            title="确认删除"
            description={`确定删除「${testCase.name}」?`}
            onConfirm={handleDelete}
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      </div>

      {/* 执行结果 */}
      {execResult && (
        <Alert
          type={execResult.status === "passed" ? "success" : "error"}
          message={
            <Space>
              <Tag color={STATUS_COLORS[execResult.status]}>{execResult.status}</Tag>
              <span>耗时: {formatDuration(execResult.duration_ms)}</span>
              {execResult.error_message && <span>错误: {execResult.error_message}</span>}
            </Space>
          }
          description={
            <div style={{ marginTop: 8 }}>
              {execResult.assertion_results && (
                <div>
                  <strong>断言结果:</strong>
                  {execResult.assertion_results.map((r: Record<string, unknown>, i: number) => (
                    <Tag key={i} color={r.passed ? "green" : "red"} style={{ marginLeft: 8 }}>
                      {r.message as string}
                    </Tag>
                  ))}
                </div>
              )}
              <details style={{ marginTop: 8 }}>
                <summary style={{ cursor: "pointer" }}>查看请求/响应详情</summary>
                <pre style={{ background: "#f6f8fa", padding: 12, borderRadius: 6, fontSize: 12, marginTop: 8 }}>
                  {JSON.stringify({ request: execResult.request_data, response: execResult.response_data }, null, 2)}
                </pre>
              </details>
            </div>
          }
          closable
          onClose={() => setExecResult(null)}
          style={{ marginBottom: 24 }}
        />
      )}

      <Descriptions bordered column={1} size="middle" style={{ marginBottom: 24 }}>
        <Descriptions.Item label="ID">
          <Typography.Text copyable>{testCase.id}</Typography.Text>
        </Descriptions.Item>
        <Descriptions.Item label="协议">
          <Tag color="blue">{testCase.protocol}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="标签">
          {testCase.tags?.length ? testCase.tags.map((t: string) => <Tag key={t}>{t}</Tag>) : "-"}
        </Descriptions.Item>
        <Descriptions.Item label="描述">{testCase.description || "-"}</Descriptions.Item>
        <Descriptions.Item label="创建时间">{new Date(testCase.created_at).toLocaleString("zh-CN")}</Descriptions.Item>
        <Descriptions.Item label="更新时间">{new Date(testCase.updated_at).toLocaleString("zh-CN")}</Descriptions.Item>
      </Descriptions>

      <Typography.Title level={4}>报文定义</Typography.Title>
      <pre style={{ background: "#f6f8fa", border: "1px solid #e8e8e8", borderRadius: 8, padding: 16, maxHeight: 400, overflow: "auto", fontSize: 13 }}>
        {JSON.stringify(testCase.message_definition, null, 2)}
      </pre>

      <Typography.Title level={4} style={{ marginTop: 24 }}>断言规则</Typography.Title>
      <pre style={{ background: "#f6f8fa", border: "1px solid #e8e8e8", borderRadius: 8, padding: 16, maxHeight: 300, overflow: "auto", fontSize: 13 }}>
        {JSON.stringify(testCase.assertion_rules ?? [], null, 2)}
      </pre>

      <Typography.Title level={4} style={{ marginTop: 24 }}>变量列表</Typography.Title>
      <pre style={{ background: "#f6f8fa", border: "1px solid #e8e8e8", borderRadius: 8, padding: 16, maxHeight: 300, overflow: "auto", fontSize: 13 }}>
        {JSON.stringify(testCase.variables ?? [], null, 2)}
      </pre>

      {/* 执行历史 */}
      <Typography.Title level={4} style={{ marginTop: 32 }}>执行历史</Typography.Title>
      <Table
        dataSource={history}
        rowKey="id"
        size="small"
        pagination={{ pageSize: 10, showTotal: (total) => `共 ${total} 次` }}
        columns={[
          {
            title: "状态",
            dataIndex: "status",
            width: 90,
            render: (s: string) => <Tag color={STATUS_COLORS[s] ?? "default"}>{s}</Tag>,
          },
          {
            title: "耗时",
            dataIndex: "duration_ms",
            width: 80,
            render: formatDuration,
          },
          {
            title: "断言",
            dataIndex: "assertion_results",
            width: 260,
            render: (results: Array<{ passed: boolean; message: string }> | null) =>
              results?.map((r, i) => (
                <Tag key={i} color={r.passed ? "green" : "red"}>{r.message}</Tag>
              )) || "-",
          },
          {
            title: "错误",
            dataIndex: "error_message",
            ellipsis: true,
            render: (e: string | null) => e || "-",
          },
          {
            title: "时间",
            dataIndex: "created_at",
            width: 170,
            render: (t: string) => new Date(t).toLocaleString("zh-CN"),
          },
          {
            title: "操作",
            key: "actions",
            width: 70,
            render: (_: unknown, record: ExecutionLog) => (
              <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => navigate(`/execution-logs/${record.id}`)}>
                查看
              </Button>
            ),
          },
        ]}
        locale={{ emptyText: "暂无执行记录，点击上方「执行」按钮开始测试" }}
      />
    </>
  );
}
