from sqlalchemy import CheckConstraint, ForeignKey, Identity, Index, String, text
from sqlalchemy.orm import Mapped, mapped_column

from backend.db.database import Base


class RestaurantRecord(Base):
    __tablename__ = "restaurants"

    __table_args__ = (
        CheckConstraint("latitude BETWEEN -90 AND 90"),
        CheckConstraint("longitude BETWEEN -180 AND 180"),
    )

    id: Mapped[int] = mapped_column(Identity(), primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    latitude: Mapped[float]
    longitude: Mapped[float]


class CourierRecord(Base):
    __tablename__ = "couriers"

    __table_args__ = (
        CheckConstraint("latitude BETWEEN -90 AND 90"),
        CheckConstraint("longitude BETWEEN -180 AND 180"),
    )

    id: Mapped[int] = mapped_column(Identity(), primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    latitude: Mapped[float]
    longitude: Mapped[float]
    is_available: Mapped[bool] = mapped_column(default=False)


class OrderRecord(Base):
    __tablename__ = "orders"

    __table_args__ = (
        CheckConstraint("delivery_latitude BETWEEN -90 AND 90"),
        CheckConstraint("delivery_longitude BETWEEN -180 AND 180"),
        CheckConstraint(
            "status IN ('pending', 'assigned', 'accepted', 'picked_up', 'delivered')"
        ),
        CheckConstraint(
            "(status = 'pending' AND courier_id IS NULL) OR "
            "(status != 'pending' AND courier_id IS NOT NULL)"
        ),
        Index(
            "uq_courier_active_order",
            "courier_id",
            unique=True,
            postgresql_where=text(
                "status IN ('assigned', 'accepted', 'picked_up')"
            ),
        ),
    )

    id: Mapped[int] = mapped_column(Identity(), primary_key=True)

    restaurant_id: Mapped[int] = mapped_column(
        ForeignKey("restaurants.id")
    )

    delivery_latitude: Mapped[float]
    delivery_longitude: Mapped[float]

    courier_id: Mapped[int | None] = mapped_column(
        ForeignKey("couriers.id")
    )

    status: Mapped[str] = mapped_column(
        String(20),
        default="pending",
    )