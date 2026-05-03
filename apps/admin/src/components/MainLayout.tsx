import { useLocation, useNavigate, Outlet } from "react-router-dom";
import { Layout, Menu, Typography } from "antd";
import { ExperimentOutlined, FileTextOutlined, DashboardOutlined, AppstoreOutlined, SettingOutlined } from "@ant-design/icons";

const { Header, Sider, Content } = Layout;

const menuItems = [
  { key: "/", icon: <DashboardOutlined />, label: "概览" },
  { key: "/test-cases", icon: <ExperimentOutlined />, label: "测试用例" },
  { key: "/suites", icon: <AppstoreOutlined />, label: "测试套件" },
  { key: "/execution-logs", icon: <FileTextOutlined />, label: "执行记录" },
  { key: "/environments", icon: <SettingOutlined />, label: "环境变量" },
];

export function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const selectedKey = "/" + location.pathname.split("/")[1];

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Header style={{ display: "flex", alignItems: "center", padding: "0 24px" }}>
        <Typography.Title level={4} style={{ color: "#fff", margin: 0, marginRight: 32, whiteSpace: "nowrap" }}>
          autoccTest
        </Typography.Title>
      </Header>
      <Layout>
        <Sider width={200} style={{ background: "#fff" }}>
          <Menu
            mode="inline"
            items={menuItems}
            selectedKeys={[selectedKey]}
            onClick={({ key }) => navigate(key)}
            style={{ height: "100%", borderRight: 0, paddingTop: 8 }}
          />
        </Sider>
        <Content style={{ padding: 24, minHeight: 280 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
