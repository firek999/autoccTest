"""Suite Pydantic schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class SuiteBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    test_case_ids: list[UUID] = Field(default_factory=list)


class SuiteCreate(SuiteBase):
    pass


class SuiteUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    test_case_ids: list[UUID] | None = None


class SuiteResponse(SuiteBase):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    created_at: datetime
    updated_at: datetime
