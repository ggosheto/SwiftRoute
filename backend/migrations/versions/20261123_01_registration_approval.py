"""Одобряване на публичните регистрации. Запазва съществуващите акаунти.

Revision ID: 20261123_01
Revises: 20261122_01
"""
from alembic import op
import sqlalchemy as sa

revision = "20261123_01"
down_revision = "20261122_01"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("users", sa.Column(
        "approval_status", sa.String(20), nullable=False,
        server_default=sa.text("'approved'"),
    ))
    op.create_check_constraint("ck_users_approval_status", "users", "approval_status IN ('pending', 'approved')")
    op.create_check_constraint("ck_users_pending_inactive", "users", "approval_status = 'approved' OR NOT is_active")
    op.create_check_constraint("ck_users_admin_approved", "users", "role != 'admin' OR approval_status = 'approved'")


def downgrade():
    # pending остава is_active=False и при връщане към старата схема.
    op.drop_constraint("ck_users_admin_approved", "users", type_="check")
    op.drop_constraint("ck_users_pending_inactive", "users", type_="check")
    op.drop_constraint("ck_users_approval_status", "users", type_="check")
    op.drop_column("users", "approval_status")
