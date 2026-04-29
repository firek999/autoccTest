import { Card, Col, Row, Statistic, Typography } from "antd";
import { ExperimentOutlined, CheckCircleOutlined, ClockCircleOutlined, ThunderboltOutlined } from "@ant-design/icons";

export function DashboardPage() {
  return (
    <>
      <Typography.Title level={3}>验收测试概览</Typography.Title>
      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic title="测试用例总数" value={0} prefix={<ExperimentOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="执行通过" value={0} valueStyle={{ color: "#3f8600" }} prefix={<CheckCircleOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="待执行" value={0} prefix={<ClockCircleOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="压测任务" value={0} prefix={<ThunderboltOutlined />} />
          </Card>
        </Col>
      </Row>
    </>
  );
}
