"""Добавя акаунти към вече съществуващата база на SwiftRoute.

Първата проследявана миграция започва от съществуващите таблици
restaurants, couriers и orders. Тя не пресъздава тази начална схема.
"""

from alembic import context, op
import sqlalchemy as sa


revision = "20261119_01"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    if not context.is_offline_mode():
        existing_tables = set(sa.inspect(op.get_bind()).get_table_names())
        required_tables = {"restaurants", "couriers", "orders"}
        missing_tables = required_tables - existing_tables
        if missing_tables:
            raise RuntimeError(
                "Миграцията очаква съществуващата база на SwiftRoute. "
                "Липсват таблици: " + ", ".join(sorted(missing_tables))
                + ". Провери DB_NAME и първоначалното създаване на базата."
            )

    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), sa.Identity(), primary_key=True),
        sa.Column("email", sa.String(254), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("role", sa.String(20), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("restaurant_id", sa.Integer(), nullable=True),
        sa.Column("courier_id", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(
            ["restaurant_id"], ["restaurants.id"],
            name="fk_users_restaurant_id", ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["courier_id"], ["couriers.id"],
            name="fk_users_courier_id", ondelete="RESTRICT",
        ),
        sa.UniqueConstraint("email", name="uq_users_email"),
        sa.UniqueConstraint("courier_id", name="uq_users_courier_id"),
        sa.CheckConstraint(
            "email = lower(trim(email)) AND length(email) > 0",
            name="ck_users_email_normalized",
        ),
        sa.CheckConstraint(
            "length(password_hash) > 0",
            name="ck_users_password_hash_not_empty",
        ),
        sa.CheckConstraint(
            "role IN ('admin', 'restaurant', 'courier')",
            name="ck_users_role",
        ),
        sa.CheckConstraint(
            "(role = 'admin' AND restaurant_id IS NULL AND courier_id IS NULL) OR "
            "(role = 'restaurant' AND restaurant_id IS NOT NULL AND courier_id IS NULL) OR "
            "(role = 'courier' AND courier_id IS NOT NULL AND restaurant_id IS NULL)",
            name="ck_users_role_link",
        ),
    )


def downgrade():
    # Премахва таблицата И акаунтите в нея. Не е команда за обичайно стартиране.
    op.drop_table("users")
