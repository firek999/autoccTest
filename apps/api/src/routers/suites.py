"""Suite CRUD 路由 — 含执行端点."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db import get_db
from src.models.suite import Suite
from src.models.test_case import TestCase
from src.schemas.execution_log import ExecutionLogResponse
from src.schemas.suite import SuiteCreate, SuiteResponse, SuiteUpdate
from src.services.executor import execute_test_case

router = APIRouter(prefix="/suites", tags=["suites"])


@router.get("/", response_model=list[SuiteResponse])
async def list_suites(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Suite).order_by(Suite.created_at.desc()))
    return result.scalars().all()


@router.get("/{suite_id}", response_model=SuiteResponse)
async def get_suite(suite_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Suite).where(Suite.id == suite_id))
    s = result.scalar_one_or_none()
    if not s:
        raise HTTPException(status_code=404, detail="套件不存在")
    return s


def _serialize_ids(data: dict) -> dict:
    """将 test_case_ids 中的 UUID 转为字符串."""
    if "test_case_ids" in data and data["test_case_ids"]:
        data["test_case_ids"] = [str(x) for x in data["test_case_ids"]]
    return data


@router.post("/", response_model=SuiteResponse, status_code=status.HTTP_201_CREATED)
async def create_suite(payload: SuiteCreate, db: AsyncSession = Depends(get_db)):
    s = Suite(**_serialize_ids(payload.model_dump()))
    db.add(s)
    await db.commit()
    await db.refresh(s)
    return s


@router.patch("/{suite_id}", response_model=SuiteResponse)
async def update_suite(suite_id: UUID, payload: SuiteUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Suite).where(Suite.id == suite_id))
    s = result.scalar_one_or_none()
    if not s:
        raise HTTPException(status_code=404, detail="套件不存在")
    data = _serialize_ids(payload.model_dump(exclude_unset=True))
    for key, value in data.items():
        setattr(s, key, value)
    await db.commit()
    await db.refresh(s)
    return s


@router.delete("/{suite_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_suite(suite_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Suite).where(Suite.id == suite_id))
    s = result.scalar_one_or_none()
    if not s:
        raise HTTPException(status_code=404, detail="套件不存在")
    await db.delete(s)
    await db.commit()


@router.post("/{suite_id}/execute", status_code=status.HTTP_201_CREATED)
async def execute_suite(suite_id: UUID, db: AsyncSession = Depends(get_db)):
    """执行套件内所有用例，返回汇总结果."""
    result = await db.execute(select(Suite).where(Suite.id == suite_id))
    s = result.scalar_one_or_none()
    if not s:
        raise HTTPException(status_code=404, detail="套件不存在")

    logs = []
    for tc_id in (s.test_case_ids or []):
        tc_result = await db.execute(select(TestCase).where(TestCase.id == tc_id))
        tc = tc_result.scalar_one_or_none()
        if not tc:
            logs.append({"test_case_id": str(tc_id), "status": "skipped", "error": "用例不存在"})
            continue
        try:
            log = await execute_test_case(
                test_case_id=tc.id,
                message_definition=tc.message_definition,
                assertion_rules=tc.assertion_rules,
                variables=tc.variables,
                db_session=db,
            )
            logs.append({
                "test_case_id": str(log.test_case_id),
                "test_case_name": tc.name,
                "status": log.status,
                "duration_ms": log.duration_ms,
                "error_message": log.error_message,
            })
        except Exception as e:
            logs.append({"test_case_id": str(tc_id), "test_case_name": tc.name, "status": "error", "error": str(e)})

    passed = sum(1 for l in logs if l["status"] == "passed")
    failed = sum(1 for l in logs if l["status"] == "failed")
    return {"suite_id": str(suite_id), "suite_name": s.name, "total": len(logs), "passed": passed, "failed": failed, "results": logs}
