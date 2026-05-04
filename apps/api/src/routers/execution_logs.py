"""执行记录查询路由 — 只读，由调度引擎写入."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from src.db import get_db
from src.models.execution_log import ExecutionLog
from src.schemas.execution_log import ExecutionLogResponse, LatestPerCaseResponse

router = APIRouter(prefix="/execution-logs", tags=["execution-logs"])


@router.get("/", response_model=list[ExecutionLogResponse])
async def list_execution_logs(test_case_id: UUID | None = None, db: AsyncSession = Depends(get_db)):
    """获取执行记录列表，可按 test_case_id 筛选."""
    query = select(ExecutionLog).order_by(ExecutionLog.created_at.desc())
    if test_case_id:
        query = query.where(ExecutionLog.test_case_id == test_case_id)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/latest-per-case", response_model=list[LatestPerCaseResponse])
async def latest_per_case(db: AsyncSession = Depends(get_db)):
    """返回每个测试用例的最新一次执行状态（聚合，仅返回必要字段）."""
    sql = text("""
        SELECT DISTINCT ON (test_case_id)
            test_case_id, status, duration_ms, created_at
        FROM execution_logs
        ORDER BY test_case_id, created_at DESC
    """)
    result = await db.execute(sql)
    return [{"test_case_id": str(r[0]), "status": r[1], "duration_ms": r[2], "created_at": r[3]} for r in result.fetchall()]


@router.get("/{log_id}", response_model=ExecutionLogResponse)
async def get_execution_log(log_id: UUID, db: AsyncSession = Depends(get_db)):
    """获取单条执行记录."""
    result = await db.execute(select(ExecutionLog).where(ExecutionLog.id == log_id))
    log = result.scalar_one_or_none()
    if not log:
        raise HTTPException(status_code=404, detail="执行记录不存在")
    return log


@router.delete("/clear", status_code=200)
async def clear_execution_logs(db: AsyncSession = Depends(get_db)):
    """清空所有执行记录."""
    await db.execute(delete(ExecutionLog))
    await db.commit()
    return {"message": "已清空"}


@router.post("/retention", status_code=200)
async def apply_retention(keep_per_case: int = 20, db: AsyncSession = Depends(get_db)):
    """每个用例仅保留最近 N 条执行记录."""
    sql = text("""
        DELETE FROM execution_logs WHERE id NOT IN (
            SELECT id FROM (
                SELECT id, ROW_NUMBER() OVER (PARTITION BY test_case_id ORDER BY created_at DESC) as rn
                FROM execution_logs
            ) sub WHERE rn <= :keep
        )
    """)
    await db.execute(sql, {"keep": keep_per_case})
    await db.commit()
    return {"message": f"每个用例保留最近 {keep_per_case} 条"}
