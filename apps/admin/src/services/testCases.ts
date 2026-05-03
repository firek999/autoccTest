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

export async function executeTestCase(id: string, timeout?: number): Promise<ExecutionLog> {
  const { data } = await apiClient.post<ExecutionLog>(`/test-cases/${id}/execute`, { timeout });
  return data;
}

export function getExportUrl(): string {
  return `${apiClient.defaults.baseURL}/test-cases/export`;
}

export async function importTestCases(file: File): Promise<TestCase[]> {
  const form = new FormData();
  form.append("file", file);
  const { data } = await apiClient.post<TestCase[]>("/test-cases/import", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function toggleStar(id: string): Promise<TestCase> {
  const { data } = await apiClient.patch<TestCase>(`/test-cases/${id}/star`);
  return data;
}

export async function toggleArchive(id: string): Promise<TestCase> {
  const { data } = await apiClient.patch<TestCase>(`/test-cases/${id}/archive`);
  return data;
}

export function generateCurl(tc: TestCase): string {
  const def = tc.message_definition;
  const method = (def.method as string) || "GET";
  const url = (def.url as string) || "/";
  const headers = def.headers ? Object.entries(def.headers as Record<string, string>).map(([k, v]) => `-H '${k}: ${v}'`).join(" ") : "";
  const body = def.body && method !== "GET" ? `-d '${JSON.stringify(def.body)}'` : "";
  return `curl -X ${method} '${url}' ${headers} ${body}`.trim();
}
