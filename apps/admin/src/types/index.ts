/** 测试用例 */
export interface TestCase {
  id: string;
  name: string;
  description?: string | null;
  protocol: string;
  message_definition: Record<string, unknown>;
  assertion_rules?: unknown[] | null;
  variables?: unknown[] | null;
  tags?: string[] | null;
  created_at: string;
  updated_at: string;
}

/** 创建测试用例 */
export interface TestCaseCreate {
  name: string;
  description?: string | null;
  protocol?: string;
  message_definition: Record<string, unknown>;
  assertion_rules?: unknown[] | null;
  variables?: unknown[] | null;
}

/** 更新测试用例 */
export interface TestCaseUpdate {
  name?: string;
  description?: string | null;
  protocol?: string;
  message_definition?: Record<string, unknown>;
  assertion_rules?: unknown[] | null;
  variables?: unknown[] | null;
}

/** 执行记录 */
export interface ExecutionLog {
  id: string;
  test_case_id: string;
  test_case_name: string;
  status: string;
  request_data?: Record<string, unknown> | null;
  response_data?: Record<string, unknown> | null;
  assertion_results?: unknown[] | null;
  started_at?: string | null;
  completed_at?: string | null;
  duration_ms?: number | null;
  error_message?: string | null;
  created_at: string;
}

/** 测试套件 */
export interface Suite {
  id: string;
  name: string;
  description?: string | null;
  test_case_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface SuiteCreate {
  name: string;
  description?: string | null;
  test_case_ids?: string[];
}

export interface SuiteUpdate {
  name?: string;
  description?: string | null;
  test_case_ids?: string[];
}

export interface SuiteExecutionResult {
  suite_id: string;
  suite_name: string;
  total: number;
  passed: number;
  failed: number;
  results: Array<{ test_case_id: string; test_case_name: string; status: string; duration_ms?: number; error_message?: string }>;
}

/** 环境变量 */
export interface Environment {
  id: string;
  name: string;
  description?: string | null;
  variables: Record<string, string>;
  created_at: string;
  updated_at: string;
}

export interface EnvironmentCreate {
  name: string;
  description?: string | null;
  variables: Record<string, string>;
}

/** 仪表盘统计 */
export interface DashboardStats {
  total_test_cases: number;
  total_executions: number;
  passed_executions: number;
  pending_executions: number;
}
