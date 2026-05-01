"""ExecutionLog Pydantic schemas — 只读，由调度引擎写入."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class LatestPerCaseResponse(BaseModel):
    """每个用例最新执行状态（聚合端点专用）."""
    test_case_id: str
    status: str
    duration_ms: int | None = None
    created_at: datetime


class ExecutionLogResponse(BaseModel):
    """执行记录 API 响应."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    test_case_id: UUID
    test_case_name: str = ""
    status: str
    request_data: dict | None = None
    response_data: dict | None = None
    assertion_results: list | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None
    duration_ms: int | None = None
    error_message: str | None = None
    created_at: datetime
