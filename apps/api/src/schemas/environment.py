"""Environment Pydantic schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class EnvironmentBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    variables: dict = Field(default_factory=dict, description="环境变量键值对，如 {\"base_url\": \"http://api:8000\"}")


class EnvironmentCreate(EnvironmentBase):
    pass


class EnvironmentUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    variables: dict | None = None


class EnvironmentResponse(EnvironmentBase):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    created_at: datetime
    updated_at: datetime
