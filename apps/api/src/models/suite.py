"""Suite ORM 模型 — 测试套件."""

from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import JSON, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from src.models.base import Base


class Suite(Base):
    """测试套件 ORM 模型."""

    __tablename__ = "suites"

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    test_case_ids: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    created_at: Mapped[datetime] = mapped_column(default=datetime.now)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.now)
