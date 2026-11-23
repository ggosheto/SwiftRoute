"""Ограничения на видимите записи според текущия акаунт.

Филтрите се изпълняват в SQL, включително при заявки по номер.
Чужд и несъществуващ запис връщат еднакъв отговор 404.
"""

from sqlalchemy import false, or_, select

from backend.auth_schemas import CurrentUser
from backend.db_models import CourierRecord, OrderRecord, RestaurantRecord


ACTIVE_STATUSES = ("assigned", "accepted", "picked_up")


def visible_orders(user: CurrentUser):
    statement = select(OrderRecord)
    if user.role == "admin":
        return statement
    if user.role == "restaurant" and user.restaurant_id is not None:
        return statement.where(OrderRecord.restaurant_id == user.restaurant_id)
    if user.role == "courier" and user.courier_id is not None:
        return statement.where(OrderRecord.courier_id == user.courier_id)
    return statement.where(false())


def visible_restaurants(user: CurrentUser):
    statement = select(RestaurantRecord)
    if user.role == "admin":
        return statement
    if user.role == "restaurant" and user.restaurant_id is not None:
        return statement.where(RestaurantRecord.id == user.restaurant_id)
    if user.role == "courier" and user.courier_id is not None:
        assigned_restaurants = select(OrderRecord.restaurant_id).where(
            OrderRecord.courier_id == user.courier_id
        )
        return statement.where(RestaurantRecord.id.in_(assigned_restaurants))
    return statement.where(false())


def visible_couriers(user: CurrentUser):
    statement = select(CourierRecord)
    if user.role == "admin":
        return statement
    if user.role == "courier" and user.courier_id is not None:
        return statement.where(CourierRecord.id == user.courier_id)
    if user.role == "restaurant" and user.restaurant_id is not None:
        serving_restaurant = select(OrderRecord.courier_id).where(
            OrderRecord.restaurant_id == user.restaurant_id,
            OrderRecord.status.in_(ACTIVE_STATUSES),
        )
        # Ресторантът вижда кандидатите за възлагане и куриерите по
        # своите активни доставки, без заети куриери на други ресторанти.
        return statement.where(or_(
            CourierRecord.is_available.is_(True),
            CourierRecord.id.in_(serving_restaurant),
        ))
    return statement.where(false())
