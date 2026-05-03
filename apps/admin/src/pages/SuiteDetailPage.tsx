import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { Alert, Button, Card, Descriptions, Progress, Space, Spin, Table, Tag, Typography, message } from "antd";
import { ArrowLeftOutlined, PlayCircleOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { fetchSuite, deleteSuite, executeSuite } from "../services/suites";
import type { SuiteExecutionResult } from "../types";

export function SuiteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [execResult, setExecResult] = useState<SuiteExecutionResult | null>(null);

  const { data: suite, isLoading } = useQuery({ queryKey: ["suite", id], queryFn: () => fetchSuite(id!), enabled: !!id });

  const execMutation = useMutation({
    mutationFn: () => executeSuite(id!),
    onSuccess: setExecResult,
  });

  if (isLoading) return <Spin size="large" style={{ display: "block", marginTop: 80 }} />;
  if (!suite) return <Typography.Text type="danger">套件不存在</Typography.Text>;

  const passRate = execResult && execResult.total > 0 ? Math.round((execResult.passed / execResult.total) * 100) : 0;

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/suites")}>返回列表</Button>
          <Typography.Title level={3} style={{ margin: 0 }}>{suite.name}</Typography.Title>
          <Tag>{(suite.test_case_ids || []).length} 个用例</Tag>
        </Space>
        <Space>
          <Button type="primary" icon={<PlayCircleOutlined />} loading={execMutation.isPending}
            onClick={() => execMutation.mutate()} disabled={execMutation.isPending}>
            执行全部
          </Button>
          <Button icon={<EditOutlined />} onClick={() => navigate(`/suites/${id}/edit`)}>编辑</Button>
          <Button danger icon={<DeleteOutlined />} onClick={async () => { await deleteSuite(id!); message.success("已删除"); navigate("/suites"); }}>删除</Button>
        </Space>
      </div>

      {execResult && (
        <Card style={{ marginBottom: 24, borderColor: execResult.failed === 0 ? "#52c41a" : "#ff4d4f" }}>
          <Space direction="vertical" style={{ width: "100%" }}>
            <Progress percent={passRate} status={execResult.failed === 0 ? "success" : "exception"} format={() => `${execResult.passed}/${execResult.total}`} />
            <Table dataSource={execResult.results} rowKey="test_case_id" size="small" pagination={false}
              columns={[
                { title: "用例", dataIndex: "test_case_name", key: "name" },
                { title: "状态", dataIndex: "status", key: "status", width: 90, render: (s: string) => <Tag color={s === "passed" ? "success" : s === "failed" ? "error" : "warning"}>{s}</Tag> },
                { title: "耗时", dataIndex: "duration_ms", key: "duration", width: 80, render: (v: number) => v ? `${v}ms` : "-" },
                { title: "错误", dataIndex: "error_message", key: "error", ellipsis: true, render: (e: string) => e || "-" },
              ]} />
          </Space>
        </Card>
      )}

      <Descriptions bordered column={1} size="middle" style={{ marginBottom: 24 }}>
        <Descriptions.Item label="描述">{suite.description || "-"}</Descriptions.Item>
        <Descriptions.Item label="创建时间">{new Date(suite.created_at).toLocaleString("zh-CN")}</Descriptions.Item>
        <Descriptions.Item label="更新时间">{new Date(suite.updated_at).toLocaleString("zh-CN")}</Descriptions.Item>
      </Descriptions>

      <Typography.Title level={4}>包含的用例 ({suite.test_case_ids.length})</Typography.Title>
      {suite.test_case_ids.length === 0 ? (
        <Typography.Text type="secondary">暂无用例，点击编辑添加</Typography.Text>
      ) : (
        suite.test_case_ids.map((tcId) => (
          <Tag key={tcId} style={{ margin: 4 }}><a onClick={() => navigate(`/test-cases/${tcId}`)}>{tcId.slice(0, 8)}...</a></Tag>
        ))
      )}
    </>
  );
}
