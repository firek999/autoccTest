import { useQuery } from "@tanstack/react-query";
import { Card, Col, Row, Statistic, Typography, Spin, Alert } from "antd";
import { ExperimentOutlined, CheckCircleOutlined, ClockCircleOutlined, ThunderboltOutlined } from "@ant-design/icons";
import { fetchDashboardStats } from "../services/dashboard";

export function DashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: fetchDashboardStats,
    refetchInterval: 30_000,
  });

  return (
    <>
      <Typography.Title level={3}>验收测试概览</Typography.Title>

      {error && <Alert message="加载统计数据失败" type="error" showIcon style={{ marginBottom: 16 }} />}

      {isLoading ? (
        <Spin size="large" style={{ display: "block", marginTop: 80 }} />
      ) : (
        <Row gutter={16}>
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
      )}
    </>
  );
}
