"""Публичната регистрация създава нов профил и чакащ акаунт атомарно."""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from backend.core.auth_dependencies import check_request_origin, no_cache
from backend.db.auth_models import UserRecord
from backend.routers.auth_router import LoginLimiter
from backend.db.database import SessionLocal
from backend.db.db_models import CourierRecord, RestaurantRecord
from backend.schemas.registration_schemas import RegisterRequest, RegistrationResult
from backend.core.security import hash_password
from backend.routing.service_area import require_service_area

router = APIRouter(prefix="/auth", tags=["Регистрация"],
    dependencies=[Depends(check_request_origin), Depends(no_cache)])
registration_limiter = LoginLimiter(limit=5)


@router.post("/register", status_code=201, response_model=RegistrationResult)
def register(data: RegisterRequest, request: Request):
    registration_limiter.check(request.client.host if request.client else "unknown")
    require_service_area(data.latitude, data.longitude, "Адресът на профила")
    # Скъпото хеширане е преди транзакцията. Паролата не се записва в прав текст.
    password_hash = hash_password(data.password.get_secret_value())
    try:
        with SessionLocal.begin() as db:
            if db.scalar(select(UserRecord.id).where(UserRecord.email == data.email)) is not None:
                raise HTTPException(409, "Вече има акаунт с този имейл. Използвай входа или се свържи с администратора.")
            values = dict(name=data.name, latitude=data.latitude, longitude=data.longitude)
            if data.role == "restaurant":
                profile = RestaurantRecord(**values)
            else:
                profile = CourierRecord(**values, is_available=False)
            db.add(profile)
            db.flush()
            db.add(UserRecord(
                email=data.email, password_hash=password_hash, role=data.role,
                restaurant_id=profile.id if data.role == "restaurant" else None,
                courier_id=profile.id if data.role == "courier" else None,
                approval_status="pending", is_active=False,
            ))
            db.flush()
    except IntegrityError as error:
        # Rollback премахва и новия профил при състезание за същия имейл.
        raise HTTPException(409, "Регистрацията не беше записана. Имейлът може вече да се използва.") from error
    return RegistrationResult(message="Регистрацията е изпратена. Изчакай одобрение от администратор, преди да влезеш.")
