import { apiClient } from "./api";
import type { ExecutionLog } from "../types";

export async function fetchExecutionLogs(testCaseId?: string): Promise<ExecutionLog[]> {
  const params = testCaseId ? { test_case_id: testCaseId } : undefined;
  const { data } = await apiClient.get<ExecutionLog[]>("/execution-logs/", { params });
  return data;
}

export async function fetchExecutionLog(id: string): Promise<ExecutionLog> {
  const { data } = await apiClient.get<ExecutionLog>(`/execution-logs/${id}`);
  return data;
}

export interface LatestPerCase {
  test_case_id: string;
  status: string;
  duration_ms: number | null;
  created_at: string;
}

/** 获取每个用例的最新执行状态（轻量聚合） */
export async function fetchLatestPerCase(): Promise<LatestPerCase[]> {
  const { data } = await apiClient.get<LatestPerCase[]>("/execution-logs/latest-per-case");
  return data;
}
