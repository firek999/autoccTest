"""测试用例 CRUD 路由 — 含执行、导入导出端点."""

from uuid import UUID

from pydantic import BaseModel, Field

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import json
import io

from src.db import get_db
from src.models.test_case import TestCase
from src.schemas.execution_log import ExecutionLogResponse
from src.schemas.test_case import TestCaseCreate, TestCaseResponse, TestCaseUpdate
from src.services.executor import execute_test_case

router = APIRouter(prefix="/test-cases", tags=["test-cases"])


@router.get("/", response_model=list[TestCaseResponse])
async def list_test_cases(tag: str | None = Query(None), db: AsyncSession = Depends(get_db)):
    """获取所有测试用例，可选按标签筛选."""
    result = await db.execute(select(TestCase).order_by(TestCase.created_at.desc()))
    cases = result.scalars().all()
    if tag:
        cases = [c for c in cases if c.tags and tag in c.tags]
    return cases


@router.get("/export", response_class=StreamingResponse)
async def export_test_cases(db: AsyncSession = Depends(get_db)):
    """导出所有测试用例为 JSON 文件下载."""
    result = await db.execute(select(TestCase).order_by(TestCase.created_at.desc()))
    cases = result.scalars().all()
    data = [{"name": c.name, "description": c.description, "protocol": c.protocol,
             "message_definition": c.message_definition, "assertion_rules": c.assertion_rules, "variables": c.variables} for c in cases]
    json_bytes = json.dumps(data, ensure_ascii=False, indent=2).encode("utf-8")
    return StreamingResponse(io.BytesIO(json_bytes), media_type="application/json",
                             headers={"Content-Disposition": f"attachment; filename=autocc-test-cases-{len(data)}.json"})


@router.post("/import", response_model=list[TestCaseResponse], status_code=status.HTTP_201_CREATED)
async def import_test_cases_endpoint(file: UploadFile, db: AsyncSession = Depends(get_db)):
    """从 JSON 文件批量导入测试用例."""
    if not file.filename or not file.filename.endswith(".json"):
        raise HTTPException(status_code=400, detail="请上传 .json 文件")
    try:
        content = await file.read()
        items = json.loads(content.decode("utf-8"))
        if not isinstance(items, list):
            raise ValueError("JSON 必须是数组")
    except (json.JSONDecodeError, ValueError, UnicodeDecodeError) as e:
        raise HTTPException(status_code=400, detail=f"JSON 格式错误: {e}")
    created: list[TestCase] = []
    for item in items:
        try:
            tc = TestCase(name=item.get("name", "未命名"), description=item.get("description"),
                          protocol=item.get("protocol", "HTTP"), message_definition=item.get("message_definition", {}),
                          assertion_rules=item.get("assertion_rules"), variables=item.get("variables"))
            db.add(tc)
            created.append(tc)
        except Exception:
            continue
    await db.commit()
    for tc in created:
        await db.refresh(tc)
    return created


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


class ExecuteRequest(BaseModel):
    timeout: int = Field(default=30, ge=1, le=120, description="超时秒数")


@router.post("/{test_case_id}/execute", response_model=ExecutionLogResponse, status_code=status.HTTP_201_CREATED)
async def execute_test_case_endpoint(test_case_id: UUID, payload: ExecuteRequest = ExecuteRequest(), db: AsyncSession = Depends(get_db)):
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
        timeout=payload.timeout,
    )
    return log


@router.patch("/{test_case_id}/star", response_model=TestCaseResponse)
async def toggle_star(test_case_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(TestCase).where(TestCase.id == test_case_id))
    tc = result.scalar_one_or_none()
    if not tc: raise HTTPException(status_code=404, detail="测试用例不存在")
    tc.starred = not tc.starred
    await db.commit(); await db.refresh(tc)
    return tc


@router.patch("/{test_case_id}/archive", response_model=TestCaseResponse)
async def toggle_archive(test_case_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(TestCase).where(TestCase.id == test_case_id))
    tc = result.scalar_one_or_none()
    if not tc: raise HTTPException(status_code=404, detail="测试用例不存在")
    tc.archived = not tc.archived
    await db.commit(); await db.refresh(tc)
    return tc
