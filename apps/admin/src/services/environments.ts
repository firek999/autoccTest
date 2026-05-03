import { apiClient } from "./api";
import type { Environment, EnvironmentCreate } from "../types";

export async function fetchEnvironments(): Promise<Environment[]> {
  const { data } = await apiClient.get<Environment[]>("/environments/");
  return data;
}

export async function createEnvironment(payload: EnvironmentCreate): Promise<Environment> {
  const { data } = await apiClient.post<Environment>("/environments/", payload);
  return data;
}

export async function updateEnvironment(id: string, payload: Partial<EnvironmentCreate>): Promise<Environment> {
  const { data } = await apiClient.patch<Environment>(`/environments/${id}`, payload);
  return data;
}

export async function deleteEnvironment(id: string): Promise<void> {
  await apiClient.delete(`/environments/${id}`);
}
