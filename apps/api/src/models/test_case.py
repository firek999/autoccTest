"""TestCase ORM 模型 — 映射 test_cases 表."""

from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import JSON, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from src.models.base import Base


class TestCase(Base):
    """测试用例 ORM 模型."""

    __tablename__ = "test_cases"

    id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid4,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    protocol: Mapped[str] = mapped_column(String(50), nullable=False, default="HTTP")
    message_definition: Mapped[dict] = mapped_column(JSON, nullable=False)
    assertion_rules: Mapped[list | None] = mapped_column(JSON, nullable=True)
    variables: Mapped[list | None] = mapped_column(JSON, nullable=True)
    tags: Mapped[list | None] = mapped_column(JSON, nullable=True, default=list)
    created_at: Mapped[datetime] = mapped_column(default=datetime.now)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.now)
