from email_validator import EmailNotValidError, validate_email
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.db.auth_models import UserRecord
from backend.db.db_models import CourierRecord, RestaurantRecord
from backend.core.security import hash_password


def normalize_email(email: str) -> str:
    try:
        result = validate_email(email.strip(), check_deliverability=False)
    except EmailNotValidError as error:
        raise ValueError("Въведи валиден имейл адрес.") from error

    normalized = result.normalized.lower()
    if len(normalized) > 254:
        raise ValueError("Имейл адресът е прекалено дълъг.")
    return normalized


def validate_role_links(
    role: str,
    restaurant_id: int | None,
    courier_id: int | None,
) -> None:
    if role not in ("admin", "restaurant", "courier"):
        raise ValueError("Непозната потребителска роля.")

    if any(value is not None and value <= 0 for value in (restaurant_id, courier_id)):
        raise ValueError("Номерата на ресторанта и куриера трябва да са положителни.")

    if role == "admin" and (restaurant_id is not None or courier_id is not None):
        raise ValueError("Администраторът няма връзка към конкретен ресторант или куриер.")
    if role == "restaurant" and (restaurant_id is None or courier_id is not None):
        raise ValueError("За ресторантски акаунт задай само --restaurant-id.")
    if role == "courier" and (courier_id is None or restaurant_id is not None):
        raise ValueError("За куриерски акаунт задай само --courier-id.")


def create_user(
    db: Session,
    email: str,
    password: str,
    role: str,
    restaurant_id: int | None = None,
    courier_id: int | None = None,
) -> UserRecord:

    email = normalize_email(email)
    validate_role_links(role, restaurant_id, courier_id)

    existing_id = db.scalar(select(UserRecord.id).where(UserRecord.email == email))
    if existing_id is not None:
        raise ValueError("Вече има акаунт с този имейл.")

    if restaurant_id is not None and db.get(RestaurantRecord, restaurant_id) is None:
        raise ValueError("Няма ресторант с този номер. Провери командата profiles.")

    if courier_id is not None:
        if db.get(CourierRecord, courier_id) is None:
            raise ValueError("Няма куриер с този номер. Провери командата profiles.")
        existing_courier_user = db.scalar(
            select(UserRecord.id).where(UserRecord.courier_id == courier_id)
        )
        if existing_courier_user is not None:
            raise ValueError("Този куриер вече има акаунт.")

    user = UserRecord(
        email=email,
        password_hash=hash_password(password),
        role=role,
        restaurant_id=restaurant_id,
        courier_id=courier_id,
        is_active=True,
    )
    db.add(user)
    db.flush()
    return user
