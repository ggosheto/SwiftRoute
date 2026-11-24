"""Модел на акаунтите. Използва същата база като поръчките."""

from sqlalchemy import CheckConstraint, ForeignKey, Identity, String, UniqueConstraint, text
from sqlalchemy.orm import Mapped, mapped_column

from db.database import Base
from db.db_models import CourierRecord, RestaurantRecord


class UserRecord(Base):
    __tablename__ = "users"

    __table_args__ = (
        UniqueConstraint("email", name="uq_users_email"),
        UniqueConstraint("courier_id", name="uq_users_courier_id"),
        CheckConstraint(
            "email = lower(trim(email)) AND length(email) > 0",
            name="ck_users_email_normalized",
        ),
        CheckConstraint(
            "length(password_hash) > 0",
            name="ck_users_password_hash_not_empty",
        ),
        CheckConstraint(
            "role IN ('admin', 'restaurant', 'courier')",
            name="ck_users_role",
        ),
        CheckConstraint("approval_status IN ('pending', 'approved')", name="ck_users_approval_status"),
        CheckConstraint("approval_status = 'approved' OR NOT is_active", name="ck_users_pending_inactive"),
        CheckConstraint("role != 'admin' OR approval_status = 'approved'", name="ck_users_admin_approved"),
        CheckConstraint(
            "(role = 'admin' AND restaurant_id IS NULL AND courier_id IS NULL) OR "
            "(role = 'restaurant' AND restaurant_id IS NOT NULL AND courier_id IS NULL) OR "
            "(role = 'courier' AND courier_id IS NOT NULL AND restaurant_id IS NULL)",
            name="ck_users_role_link",
        ),
    )

    id: Mapped[int] = mapped_column(Identity(), primary_key=True)
    email: Mapped[str] = mapped_column(String(254))
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(20))
    is_active: Mapped[bool] = mapped_column(default=True, server_default=text("true"))
    # Старите и създадените през доверения CLI акаунти са одобрени.
    # Публичната регистрация задава изрично pending + is_active=False.
    approval_status: Mapped[str] = mapped_column(
        String(20), default="approved", server_default=text("'approved'"),
    )

    restaurant_id: Mapped[int | None] = mapped_column(
        ForeignKey(RestaurantRecord.id, name="fk_users_restaurant_id", ondelete="RESTRICT")
    )
    courier_id: Mapped[int | None] = mapped_column(
        ForeignKey(CourierRecord.id, name="fk_users_courier_id", ondelete="RESTRICT")
    )
