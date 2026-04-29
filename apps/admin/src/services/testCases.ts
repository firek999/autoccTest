import { apiClient } from "./api";
import type { ExecutionLog, TestCase, TestCaseCreate, TestCaseUpdate } from "../types";

export async function fetchTestCases(): Promise<TestCase[]> {
  const { data } = await apiClient.get<TestCase[]>("/test-cases/");
  return data;
}

export async function fetchTestCase(id: string): Promise<TestCase> {
  const { data } = await apiClient.get<TestCase>(`/test-cases/${id}`);
  return data;
}

export async function createTestCase(payload: TestCaseCreate): Promise<TestCase> {
  const { data } = await apiClient.post<TestCase>("/test-cases/", payload);
  return data;
}

export async function updateTestCase(id: string, payload: TestCaseUpdate): Promise<TestCase> {
  const { data } = await apiClient.patch<TestCase>(`/test-cases/${id}`, payload);
  return data;
}

export async function deleteTestCase(id: string): Promise<void> {
  await apiClient.delete(`/test-cases/${id}`);
}

export async function executeTestCase(id: string): Promise<ExecutionLog> {
  const { data } = await apiClient.post<ExecutionLog>(`/test-cases/${id}/execute`);
  return data;
}
