import { apiClient } from "./api";
import type { DashboardStats } from "../types";
import type { TestCase } from "../types";
import type { ExecutionLog } from "../types";

/** 聚合仪表盘统计数据 */
export async function fetchDashboardStats(): Promise<DashboardStats> {
  const [casesRes, logsRes] = await Promise.all([
    apiClient.get<TestCase[]>("/test-cases/"),
    apiClient.get<ExecutionLog[]>("/execution-logs/"),
  ]);

  const total_test_cases = casesRes.data.length;
  const logs = logsRes.data;
  const total_executions = logs.length;
  const passed_executions = logs.filter((l) => l.status === "passed").length;
  const pending_executions = logs.filter((l) => l.status === "pending").length;

  return { total_test_cases, total_executions, passed_executions, pending_executions };
}
