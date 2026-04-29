"""初始迁移 — 创建 test_cases 和 execution_logs 表

Revision ID: 0001_initial
Revises: None
Create Date: 2026-04-29
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[Sequence[str], None] = None
depends_on: Union[Sequence[str], None] = None


def upgrade() -> None:
    # 启用 uuid-ossp 扩展
    op.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')

    # test_cases 表
    op.create_table(
        "test_cases",
        sa.Column(
            "id",
            sa.Uuid(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("protocol", sa.String(50), nullable=False, server_default="HTTP"),
        sa.Column("message_definition", sa.JSON, nullable=False),
        sa.Column("assertion_rules", sa.JSON, nullable=True),
        sa.Column("variables", sa.JSON, nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("NOW()")),
    )

    # execution_logs 表
    op.create_table(
        "execution_logs",
        sa.Column(
            "id",
            sa.Uuid(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column(
            "test_case_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("test_cases.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("status", sa.String(50), nullable=False, server_default="pending"),
        sa.Column("request_data", sa.JSON, nullable=True),
        sa.Column("response_data", sa.JSON, nullable=True),
        sa.Column("assertion_results", sa.JSON, nullable=True),
        sa.Column("started_at", sa.DateTime(), nullable=True),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.Column("duration_ms", sa.Integer, nullable=True),
        sa.Column("error_message", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("NOW()")),
    )


def downgrade() -> None:
    op.drop_table("execution_logs")
    op.drop_table("test_cases")
