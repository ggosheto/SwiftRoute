"""Одобрение и активност на акаунти; достъп само за администратор."""
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import case, delete, func, select
from backend.core.auth_dependencies import no_cache, require_roles
from backend.db.auth_models import UserRecord
from backend.db.database import SessionLocal
from backend.db.db_models import CourierRecord, OrderRecord, RestaurantRecord
from backend.core.permissions import ACTIVE_STATUSES
from backend.schemas.registration_schemas import AdminUserRead, AdminUsersPage, UserActivationUpdate
from backend.db.session_models import SessionRecord

router = APIRouter(prefix="/admin", tags=["Администрация"],
    dependencies=[Depends(require_roles("admin")), Depends(no_cache)])


def user_view(user, profile=None):
    return AdminUserRead(
        id=user.id, email=user.email, role=user.role,
        approval_status=user.approval_status, is_active=user.is_active,
        restaurant_id=user.restaurant_id, courier_id=user.courier_id,
        name=profile.name if profile else None,
        latitude=profile.latitude if profile else None,
        longitude=profile.longitude if profile else None,
    )


def locked_user(db, user_id):
    user = db.scalar(select(UserRecord).where(UserRecord.id == user_id).with_for_update())
    if user is None:
        raise HTTPException(404, "Акаунтът не е намерен.")
    # Не допускаме блокиране на собствения/последния администратор през този екран.
    if user.role == "admin":
        raise HTTPException(403, "Администраторските акаунти не се променят през този екран.")
    return user


def linked_profile(db, user):
    model, record_id = (CourierRecord, user.courier_id) if user.role == "courier" else (RestaurantRecord, user.restaurant_id)
    profile = db.scalar(select(model).where(model.id == record_id).with_for_update())
    if profile is None:
        raise HTTPException(409, "Свързаният профил не е намерен.")
    return profile


@router.get("/users", response_model=AdminUsersPage)
def list_users(
    status: Literal["all", "pending", "active", "inactive"] = "all",
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
):
    filters = []
    if status == "pending":
        filters.append(UserRecord.approval_status == "pending")
    elif status in ("active", "inactive"):
        filters.extend([UserRecord.approval_status == "approved", UserRecord.is_active.is_(status == "active")])
    with SessionLocal() as db:
        total = db.scalar(select(func.count()).select_from(UserRecord).where(*filters)) or 0
        rows = db.execute(
            select(UserRecord, RestaurantRecord, CourierRecord)
            .outerjoin(RestaurantRecord, UserRecord.restaurant_id == RestaurantRecord.id)
            .outerjoin(CourierRecord, UserRecord.courier_id == CourierRecord.id)
            .where(*filters)
            .order_by(case((UserRecord.approval_status == "pending", 0), else_=1), UserRecord.id.desc())
            .offset(offset).limit(limit)
        ).all()
        return AdminUsersPage(total=total, items=[user_view(user, restaurant or courier) for user, restaurant, courier in rows])


@router.post("/users/{user_id}/approve", response_model=AdminUserRead)
def approve_user(user_id: int):
    with SessionLocal.begin() as db:
        user = locked_user(db, user_id)
        if user.approval_status != "pending":
            raise HTTPException(409, "Този акаунт вече е одобрен. Обнови списъка.")
        profile = linked_profile(db, user)
        user.approval_status = "approved"
        user.is_active = True
        if user.role == "courier":
            # Одобрение на профил != начало на работа.
            profile.is_available = False
        result = user_view(user, profile)
    return result


@router.patch("/users/{user_id}/activation", response_model=AdminUserRead)
def change_activation(user_id: int, data: UserActivationUpdate):
    with SessionLocal.begin() as db:
        user = locked_user(db, user_id)
        if user.approval_status != "approved":
            raise HTTPException(409, "Първо одобри регистрацията.")
        profile = linked_profile(db, user)
        if not data.is_active:
            if user.role == "courier":
                active = db.scalar(select(OrderRecord.id).where(
                    OrderRecord.courier_id == profile.id,
                    OrderRecord.status.in_(ACTIVE_STATUSES),
                ).limit(1))
                if active is not None:
                    raise HTTPException(409, "Куриерът има активна доставка. Завърши я преди деактивиране.")
                profile.is_available = False
            db.execute(delete(SessionRecord).where(SessionRecord.user_id == user.id))
        user.is_active = data.is_active
        result = user_view(user, profile)
    return result
