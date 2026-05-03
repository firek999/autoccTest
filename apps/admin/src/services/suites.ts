import { apiClient } from "./api";
import type { Suite, SuiteCreate, SuiteUpdate, SuiteExecutionResult } from "../types";

export async function fetchSuites(): Promise<Suite[]> {
  const { data } = await apiClient.get<Suite[]>("/suites/");
  return data;
}

export async function fetchSuite(id: string): Promise<Suite> {
  const { data } = await apiClient.get<Suite>(`/suites/${id}`);
  return data;
}

export async function createSuite(payload: SuiteCreate): Promise<Suite> {
  const { data } = await apiClient.post<Suite>("/suites/", payload);
  return data;
}

export async function updateSuite(id: string, payload: SuiteUpdate): Promise<Suite> {
  const { data } = await apiClient.patch<Suite>(`/suites/${id}`, payload);
  return data;
}

export async function deleteSuite(id: string): Promise<void> {
  await apiClient.delete(`/suites/${id}`);
}

export async function executeSuite(id: string): Promise<SuiteExecutionResult> {
  const { data } = await apiClient.post<SuiteExecutionResult>(`/suites/${id}/execute`);
  return data;
}
