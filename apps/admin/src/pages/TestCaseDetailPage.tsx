import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { Alert, Button, Descriptions, InputNumber, Popconfirm, Select, Space, Spin, Table, Tag, Typography, message } from "antd";
import { EditOutlined, DeleteOutlined, ArrowLeftOutlined, PlayCircleOutlined, EyeOutlined, CopyOutlined, LinkOutlined, StarOutlined, StarFilled, InboxOutlined } from "@ant-design/icons";
import { JsonBlock } from "../components/JsonBlock";
import { copyToClipboard } from "../lib/clipboard";
import { fetchTestCase, deleteTestCase, executeTestCase, toggleStar, toggleArchive, generateCurl } from "../services/testCases";
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
  const [timeout, setTimeout_] = useState(30);
  const [historyFilter, setHistoryFilter] = useState("all");

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

  const starMutation = useMutation({
    mutationFn: () => toggleStar(id!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["test-case", id] }),
  });
  const archiveMutation = useMutation({
    mutationFn: () => toggleArchive(id!),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["test-case", id] }); message.success(testCase?.archived ? "已归档" : "已恢复"); },
  });

  // Ctrl+Enter 快捷键执行
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        executeMutation.mutate();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [executeMutation]);

  const handleCopyLink = async () => {
    await copyToClipboard(window.location.href);
    message.success("链接已复制");
  };

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
          <InputNumber min={1} max={120} value={timeout} onChange={(v) => setTimeout_(v ?? 30)} style={{ width: 70 }} addonAfter="s" size="small" />
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            loading={executeMutation.isPending}
            onClick={() => executeMutation.mutate(timeout)}
            disabled={executeMutation.isPending}
          >
            执行
          </Button>
          <Button icon={<LinkOutlined />} onClick={handleCopyLink}>复制链接</Button>
          <Button icon={testCase?.starred ? <StarFilled style={{ color: "#faad14" }} /> : <StarOutlined />}
            onClick={() => starMutation.mutate()}>收藏</Button>
          <Button icon={<InboxOutlined />} onClick={() => archiveMutation.mutate()}
            type={testCase?.archived ? "dashed" : "default"}>{testCase?.archived ? "恢复" : "归档"}</Button>
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

      {/* curl 命令 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>cURL 命令</Typography.Title>
        <Button size="small" icon={<CopyOutlined />} onClick={() => { copyToClipboard(generateCurl(testCase!)); message.success("已复制"); }}>复制</Button>
      </div>
      <pre style={{ background: "#1e1e1e", color: "#d4d4d4", borderRadius: 8, padding: 12, fontSize: 12, overflow: "auto", marginTop: 8 }}>
        {generateCurl(testCase!)}
      </pre>

      <JsonBlock title="报文定义" data={testCase.message_definition} />
      <JsonBlock title="断言规则" data={testCase.assertion_rules ?? []} />
      <JsonBlock title="变量列表" data={testCase.variables ?? []} />

      {/* 执行历史 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 32 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>执行历史</Typography.Title>
        <Select
          value={historyFilter}
          onChange={setHistoryFilter}
          size="small"
          style={{ width: 100 }}
          options={[{ value: "all", label: "全部" }, { value: "passed", label: "通过" }, { value: "failed", label: "失败" }]}
        />
      </div>
      <Table
        dataSource={history?.filter((l) => historyFilter === "all" || l.status === historyFilter)}
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
