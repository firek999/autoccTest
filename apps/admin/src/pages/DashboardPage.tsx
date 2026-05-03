import { useQuery } from "@tanstack/react-query";
import { Card, Col, List, Progress, Row, Spin, Statistic, Tag, Typography, Alert } from "antd";
import { ExperimentOutlined, CheckCircleOutlined, ClockCircleOutlined, ThunderboltOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { fetchDashboardStats } from "../services/dashboard";
import { fetchExecutionLogs } from "../services/executionLogs";

export function DashboardPage() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: fetchDashboardStats,
    refetchInterval: 30_000,
  });

  const { data: recentLogs } = useQuery({
    queryKey: ["execution-logs"],
    queryFn: () => fetchExecutionLogs(),
    refetchInterval: 30_000,
  });

  const failedLogs = recentLogs?.filter((l) => l.status === "failed").slice(0, 5) ?? [];

  const passRate = data && data.total_executions > 0
    ? Math.round((data.passed_executions / data.total_executions) * 100)
    : 0;

  // 30天趋势数据
  const trendData = (() => {
    const days: Record<string, { total: number; passed: number }> = {};
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      days[d.toISOString().slice(0, 10)] = { total: 0, passed: 0 };
    }
    for (const log of recentLogs ?? []) {
      const date = log.created_at.slice(0, 10);
      if (days[date]) { days[date].total++; if (log.status === "passed") days[date].passed++; }
    }
    return Object.entries(days).map(([date, v]) => ({ date: date.slice(5), total: v.total, passed: v.passed }));
  })();
  const maxTotal = Math.max(...trendData.map((d) => d.total), 1);

  return (
    <>
      <Typography.Title level={3}>验收测试概览</Typography.Title>

      {error && <Alert message="加载统计数据失败" type="error" showIcon style={{ marginBottom: 16 }} />}

      {isLoading ? (
        <Spin size="large" style={{ display: "block", marginTop: 80 }} />
      ) : (
        <>
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={6}>
              <Card>
                <Statistic title="测试用例总数" value={data?.total_test_cases ?? 0} prefix={<ExperimentOutlined />} />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic title="执行通过" value={data?.passed_executions ?? 0} valueStyle={{ color: "#3f8600" }} prefix={<CheckCircleOutlined />} />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic title="待执行" value={data?.pending_executions ?? 0} prefix={<ClockCircleOutlined />} />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic title="总执行次数" value={data?.total_executions ?? 0} prefix={<ThunderboltOutlined />} />
              </Card>
            </Col>
          </Row>

          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={12}>
              <Card title="通过率">
                <Progress
                  type="circle"
                  percent={passRate}
                  status={passRate >= 80 ? "success" : passRate >= 50 ? "normal" : "exception"}
                  format={() => `${passRate}%`}
                />
                <div style={{ marginTop: 16, textAlign: "center", color: "#888" }}>
                  {data?.passed_executions ?? 0} / {data?.total_executions ?? 0} 次通过
                </div>
              </Card>
            </Col>
            <Col span={12}>
              <Card
                title="最近执行"
                extra={<a onClick={() => navigate("/execution-logs")}>查看全部</a>}
              >
                <List
                  size="small"
                  dataSource={recentLogs?.slice(0, 5)}
                  locale={{ emptyText: "暂无执行记录" }}
                  renderItem={(item) => (
                    <List.Item
                      style={{ cursor: "pointer" }}
                      onClick={() => navigate(`/execution-logs/${item.id}`)}
                    >
                      <List.Item.Meta
                        title={
                          <span>
                            <Tag color={item.status === "passed" ? "success" : "error"}>{item.status}</Tag>
                            {item.test_case_name}
                          </span>
                        }
                        description={`${new Date(item.created_at).toLocaleString("zh-CN")}  ${item.duration_ms ? `${item.duration_ms}ms` : ""}`}
                      />
                    </List.Item>
                  )}
                />
              </Card>
            </Col>
          </Row>

          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={24}>
              <Card title="30天执行趋势">
                <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 120 }}>
                  {trendData.map((d) => (
                    <div key={d.date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <div style={{ width: "100%", maxWidth: 20, height: Math.max((d.total / maxTotal) * 100, 1), background: d.total > 0 ? (d.passed === d.total ? "#52c41a" : "#ff4d4f") : "#f0f0f0", borderRadius: "2px 2px 0 0", minHeight: d.total > 0 ? 4 : 1 }} />
                      {d.date.endsWith("01") || d.date.endsWith("15") ? <span style={{ fontSize: 9, marginTop: 2, transform: "rotate(-45deg)", whiteSpace: "nowrap" }}>{d.date}</span> : null}
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 8, fontSize: 12, color: "#888" }}>
                  <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#52c41a", borderRadius: 2, marginRight: 4 }} />全部通过</span>
                  <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#ff4d4f", borderRadius: 2, marginRight: 4 }} />有失败</span>
                  <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#f0f0f0", borderRadius: 2, marginRight: 4 }} />无执行</span>
                </div>
              </Card>
            </Col>
          </Row>

          {failedLogs.length > 0 && (
            <Row gutter={16}>
              <Col span={24}>
                <Card
                  title={<span style={{ color: "#ff4d4f" }}>最近失败 ({failedLogs.length})</span>}
                  extra={<a onClick={() => navigate("/execution-logs")}>查看全部</a>}
                >
                  <List
                    size="small"
                    dataSource={failedLogs}
                    renderItem={(item) => (
                      <List.Item style={{ cursor: "pointer" }} onClick={() => navigate(`/execution-logs/${item.id}`)}>
                        <List.Item.Meta
                          title={<span>{item.test_case_name} <Tag color="error">failed</Tag></span>}
                          description={item.error_message || new Date(item.created_at).toLocaleString("zh-CN")}
                        />
                      </List.Item>
                    )}
                  />
                </Card>
              </Col>
            </Row>
          )}
        </>
      )}
    </>
  );
}
