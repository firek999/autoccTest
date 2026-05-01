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

  const passRate = data && data.total_executions > 0
    ? Math.round((data.passed_executions / data.total_executions) * 100)
    : 0;

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
        </>
      )}
    </>
  );
}
