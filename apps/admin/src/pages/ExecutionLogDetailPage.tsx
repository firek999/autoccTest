import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { Button, Descriptions, Space, Spin, Tag, Typography } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { fetchExecutionLog } from "../services/executionLogs";

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

export function ExecutionLogDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: log, isLoading, isError } = useQuery({
    queryKey: ["execution-log", id],
    queryFn: () => fetchExecutionLog(id!),
    enabled: !!id,
  });

  if (isLoading) return <Spin size="large" style={{ display: "block", marginTop: 80 }} />;
  if (isError || !log) return <Typography.Text type="danger">加载失败，执行记录不存在</Typography.Text>;

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/execution-logs")}>
          返回列表
        </Button>
        <Typography.Title level={3} style={{ margin: 0 }}>
          执行记录{" "}
          <Typography.Text code>{log.id.slice(0, 8)}...</Typography.Text>
        </Typography.Title>
      </div>

      <Descriptions bordered column={2} size="middle" style={{ marginBottom: 24 }}>
        <Descriptions.Item label="状态">
          <Tag color={STATUS_COLORS[log.status] ?? "default"}>{log.status}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="耗时">{formatDuration(log.duration_ms)}</Descriptions.Item>
        <Descriptions.Item label="关联用例">
          <a onClick={() => navigate(`/test-cases/${log.test_case_id}`)} style={{ cursor: "pointer" }}>
            {log.test_case_id.slice(0, 8)}...
          </a>
        </Descriptions.Item>
        <Descriptions.Item label="创建时间">{new Date(log.created_at).toLocaleString("zh-CN")}</Descriptions.Item>
        <Descriptions.Item label="开始执行">{log.started_at ? new Date(log.started_at).toLocaleString("zh-CN") : "-"}</Descriptions.Item>
        <Descriptions.Item label="完成时间">{log.completed_at ? new Date(log.completed_at).toLocaleString("zh-CN") : "-"}</Descriptions.Item>
      </Descriptions>

      {log.error_message && (
        <>
          <Typography.Title level={4} type="danger">错误信息</Typography.Title>
          <pre style={{ background: "#fff2f0", border: "1px solid #ffccc7", borderRadius: 8, padding: 16, fontSize: 13 }}>
            {log.error_message}
          </pre>
        </>
      )}

      <Typography.Title level={4} style={{ marginTop: 24 }}>请求数据</Typography.Title>
      <pre style={{ background: "#f6f8fa", border: "1px solid #e8e8e8", borderRadius: 8, padding: 16, maxHeight: 400, overflow: "auto", fontSize: 13 }}>
        {JSON.stringify(log.request_data ?? {}, null, 2)}
      </pre>

      <Typography.Title level={4} style={{ marginTop: 24 }}>响应数据</Typography.Title>
      <pre style={{ background: "#f6f8fa", border: "1px solid #e8e8e8", borderRadius: 8, padding: 16, maxHeight: 400, overflow: "auto", fontSize: 13 }}>
        {JSON.stringify(log.response_data ?? {}, null, 2)}
      </pre>

      <Typography.Title level={4} style={{ marginTop: 24 }}>断言结果</Typography.Title>
      <pre style={{ background: "#f6f8fa", border: "1px solid #e8e8e8", borderRadius: 8, padding: 16, maxHeight: 300, overflow: "auto", fontSize: 13 }}>
        {JSON.stringify(log.assertion_results ?? [], null, 2)}
      </pre>
    </>
  );
}
