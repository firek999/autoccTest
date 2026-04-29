"""测试用例 CRUD 路由 — 含执行端点."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db import get_db
from src.models.test_case import TestCase
from src.schemas.execution_log import ExecutionLogResponse
from src.schemas.test_case import TestCaseCreate, TestCaseResponse, TestCaseUpdate
from src.services.executor import execute_test_case

router = APIRouter(prefix="/test-cases", tags=["test-cases"])


@router.get("/", response_model=list[TestCaseResponse])
async def list_test_cases(db: AsyncSession = Depends(get_db)):
    """获取所有测试用例."""
    result = await db.execute(select(TestCase).order_by(TestCase.created_at.desc()))
    return result.scalars().all()


@router.get("/{test_case_id}", response_model=TestCaseResponse)
async def get_test_case(test_case_id: UUID, db: AsyncSession = Depends(get_db)):
    """获取单个测试用例."""
    result = await db.execute(select(TestCase).where(TestCase.id == test_case_id))
    test_case = result.scalar_one_or_none()
    if not test_case:
        raise HTTPException(status_code=404, detail="测试用例不存在")
    return test_case


@router.post("/", response_model=TestCaseResponse, status_code=status.HTTP_201_CREATED)
async def create_test_case(payload: TestCaseCreate, db: AsyncSession = Depends(get_db)):
    """创建测试用例."""
    test_case = TestCase(**payload.model_dump())
    db.add(test_case)
    await db.commit()
    await db.refresh(test_case)
    return test_case


@router.patch("/{test_case_id}", response_model=TestCaseResponse)
async def update_test_case(test_case_id: UUID, payload: TestCaseUpdate, db: AsyncSession = Depends(get_db)):
    """更新测试用例（部分更新）."""
    result = await db.execute(select(TestCase).where(TestCase.id == test_case_id))
    test_case = result.scalar_one_or_none()
    if not test_case:
        raise HTTPException(status_code=404, detail="测试用例不存在")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(test_case, key, value)

    await db.commit()
    await db.refresh(test_case)
    return test_case


@router.delete("/{test_case_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_test_case(test_case_id: UUID, db: AsyncSession = Depends(get_db)):
    """删除测试用例."""
    result = await db.execute(select(TestCase).where(TestCase.id == test_case_id))
    test_case = result.scalar_one_or_none()
    if not test_case:
        raise HTTPException(status_code=404, detail="测试用例不存在")
    await db.delete(test_case)
    await db.commit()


@router.post("/{test_case_id}/execute", response_model=ExecutionLogResponse, status_code=status.HTTP_201_CREATED)
async def execute_test_case_endpoint(test_case_id: UUID, db: AsyncSession = Depends(get_db)):
    """执行指定测试用例 — 发送 HTTP 请求、运行断言、记录执行日志."""
    result = await db.execute(select(TestCase).where(TestCase.id == test_case_id))
    test_case = result.scalar_one_or_none()
    if not test_case:
        raise HTTPException(status_code=404, detail="测试用例不存在")

    log = await execute_test_case(
        test_case_id=test_case.id,
        message_definition=test_case.message_definition,
        assertion_rules=test_case.assertion_rules,
        variables=test_case.variables,
        db_session=db,
    )
    return log
