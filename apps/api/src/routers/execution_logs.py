"""执行记录查询路由 — 只读，由调度引擎写入."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db import get_db
from src.models.execution_log import ExecutionLog
from src.schemas.execution_log import ExecutionLogResponse

router = APIRouter(prefix="/execution-logs", tags=["execution-logs"])


@router.get("/", response_model=list[ExecutionLogResponse])
async def list_execution_logs(test_case_id: UUID | None = None, db: AsyncSession = Depends(get_db)):
    """获取执行记录列表，可按 test_case_id 筛选."""
    query = select(ExecutionLog).order_by(ExecutionLog.created_at.desc())
    if test_case_id:
        query = query.where(ExecutionLog.test_case_id == test_case_id)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{log_id}", response_model=ExecutionLogResponse)
async def get_execution_log(log_id: UUID, db: AsyncSession = Depends(get_db)):
    """获取单条执行记录."""
    result = await db.execute(select(ExecutionLog).where(ExecutionLog.id == log_id))
    log = result.scalar_one_or_none()
    if not log:
        raise HTTPException(status_code=404, detail="执行记录不存在")
    return log
