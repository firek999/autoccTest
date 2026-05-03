"""Environment CRUD 路由."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db import get_db
from src.models.environment import Environment
from src.schemas.environment import EnvironmentCreate, EnvironmentResponse, EnvironmentUpdate

router = APIRouter(prefix="/environments", tags=["environments"])


@router.get("/", response_model=list[EnvironmentResponse])
async def list_environments(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Environment).order_by(Environment.created_at.desc()))
    return result.scalars().all()


@router.get("/{env_id}", response_model=EnvironmentResponse)
async def get_environment(env_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Environment).where(Environment.id == env_id))
    env = result.scalar_one_or_none()
    if not env:
        raise HTTPException(status_code=404, detail="环境不存在")
    return env


@router.post("/", response_model=EnvironmentResponse, status_code=status.HTTP_201_CREATED)
async def create_environment(payload: EnvironmentCreate, db: AsyncSession = Depends(get_db)):
    env = Environment(**payload.model_dump())
    db.add(env)
    await db.commit()
    await db.refresh(env)
    return env


@router.patch("/{env_id}", response_model=EnvironmentResponse)
async def update_environment(env_id: UUID, payload: EnvironmentUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Environment).where(Environment.id == env_id))
    env = result.scalar_one_or_none()
    if not env:
        raise HTTPException(status_code=404, detail="环境不存在")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(env, key, value)
    await db.commit()
    await db.refresh(env)
    return env


@router.delete("/{env_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_environment(env_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Environment).where(Environment.id == env_id))
    env = result.scalar_one_or_none()
    if not env:
        raise HTTPException(status_code=404, detail="环境不存在")
    await db.delete(env)
    await db.commit()
