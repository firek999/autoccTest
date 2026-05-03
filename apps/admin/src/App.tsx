import { Routes, Route, Navigate } from "react-router-dom";
import { ConfigProvider, App as AntApp } from "antd";
import zhCN from "antd/locale/zh_CN";
import { MainLayout } from "./components/MainLayout";
import { DashboardPage } from "./pages/DashboardPage";
import { TestCaseListPage } from "./pages/TestCaseListPage";
import { TestCaseDetailPage } from "./pages/TestCaseDetailPage";
import { TestCaseFormPage } from "./pages/TestCaseFormPage";
import { ExecutionLogListPage } from "./pages/ExecutionLogListPage";
import { ExecutionLogDetailPage } from "./pages/ExecutionLogDetailPage";
import { SuiteListPage } from "./pages/SuiteListPage";
import { SuiteDetailPage } from "./pages/SuiteDetailPage";
import { SuiteFormPage } from "./pages/SuiteFormPage";
import { EnvironmentPage } from "./pages/EnvironmentPage";

export function App() {
  return (
    <ConfigProvider locale={zhCN}>
      <AntApp>
        <Routes>
          <Route element={<MainLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/test-cases" element={<TestCaseListPage />} />
            <Route path="/test-cases/new" element={<TestCaseFormPage />} />
            <Route path="/test-cases/:id/edit" element={<TestCaseFormPage />} />
            <Route path="/test-cases/:id" element={<TestCaseDetailPage />} />
            <Route path="/suites" element={<SuiteListPage />} />
            <Route path="/suites/new" element={<SuiteFormPage />} />
            <Route path="/suites/:id/edit" element={<SuiteFormPage />} />
            <Route path="/suites/:id" element={<SuiteDetailPage />} />
            <Route path="/execution-logs" element={<ExecutionLogListPage />} />
            <Route path="/execution-logs/:id" element={<ExecutionLogDetailPage />} />
            <Route path="/environments" element={<EnvironmentPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </AntApp>
    </ConfigProvider>
  );
}
