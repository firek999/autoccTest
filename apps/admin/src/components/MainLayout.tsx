import { Outlet } from "react-router-dom";
import { Layout, Menu, Typography } from "antd";
import { ExperimentOutlined } from "@ant-design/icons";

const { Header, Content } = Layout;

const menuItems = [
  {
    key: "dashboard",
    icon: <ExperimentOutlined />,
    label: "概览",
  },
];

export function MainLayout() {
  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Header style={{ display: "flex", alignItems: "center" }}>
        <Typography.Title level={4} style={{ color: "#fff", margin: 0, marginRight: 24, whiteSpace: "nowrap" }}>
          autoccTest
        </Typography.Title>
        <Menu theme="dark" mode="horizontal" items={menuItems} selectedKeys={["dashboard"]} style={{ flex: 1 }} />
      </Header>
      <Content style={{ padding: 24 }}>
        <Outlet />
      </Content>
    </Layout>
  );
}
