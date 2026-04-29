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
