import { Routes, Route, Navigate } from "react-router-dom";
import { ConfigProvider, App as AntApp } from "antd";
import zhCN from "antd/locale/zh_CN";
import { MainLayout } from "./components/MainLayout";
import { DashboardPage } from "./pages/DashboardPage";

export function App() {
  return (
    <ConfigProvider locale={zhCN}>
      <AntApp>
        <Routes>
          <Route element={<MainLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </AntApp>
    </ConfigProvider>
  );
}
