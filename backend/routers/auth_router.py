"""HTTP вход, изход и текущ потребител. Добавя се към app чрез include_router."""

import secrets
from threading import Lock
from time import monotonic

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy import select

from backend.db.database import SessionLocal
from backend.db.auth_models import UserRecord
from backend.schemas.auth_schemas import CurrentUser, LoginRequest
from core.auth_dependencies import (
    COOKIE_NAME, COOKIE_SECURE, check_request_origin, get_current_user, no_cache,
)
from core.security import hash_password, verify_password
from backend.services.user_service import normalize_email
from services.session_service import SESSION_SECONDS, create_session, revoke_session


router = APIRouter(
    prefix="/auth", tags=["Акаунти"],
    dependencies=[Depends(check_request_origin), Depends(no_cache)],
)

# Проверяваме и несъществуващ акаунт срещу валиден хеш, за да не
# пропускаме скъпата операция само когато имейлът е непознат.
_DUMMY_HASH = hash_password(secrets.token_urlsafe(32))


class LoginLimiter:
    """До 20 опита за 60 секунди от адрес, за един процес.

    За публично разполагане с няколко процеса е нужен общ лимитер
    или ограничение в reverse proxy. Не се доверяваме на X-Forwarded-For тук.
    """
    def __init__(self, limit: int = 20):
        self._lock = Lock()
        self.limit = limit
        self._attempts: dict[str, tuple[float, int]] = {}

    def check(self, key: str) -> None:
        now = monotonic()
        with self._lock:
            self._attempts = {
                address: entry for address, entry in self._attempts.items()
                if now - entry[0] < 60
            }
            started, count = self._attempts.get(key, (now, 0))
            if count >= self.limit or (key not in self._attempts and len(self._attempts) >= 10_000):
                raise HTTPException(429, "Твърде много опити. Опитай след минута.",
                                    headers={"Retry-After": "60", "Cache-Control": "no-store"})
            self._attempts[key] = (started, count + 1)


login_limiter = LoginLimiter()


@router.post("/login", response_model=CurrentUser)
def login(data: LoginRequest, request: Request, response: Response):
    login_limiter.check(request.client.host if request.client else "unknown")
    try:
        email = normalize_email(data.email)
    except ValueError:
        email = ""

    with SessionLocal.begin() as db:
        # Сериализира входа с деактивиране: не създаваме нова сесия
        # непосредствено след изтриването на сесиите от администратора.
        user = db.scalar(select(UserRecord).where(UserRecord.email == email).with_for_update())
        valid_password = verify_password(
            data.password.get_secret_value(),
            user.password_hash if user is not None else _DUMMY_HASH,
        )
        if user is None or not valid_password:
            raise HTTPException(401, "Невалиден имейл или парола.", headers={"Cache-Control": "no-store"})
        if user.approval_status == "pending":
            raise HTTPException(403, "Регистрацията ти очаква одобрение от администратор.", headers={"Cache-Control": "no-store"})
        if not user.is_active:
            raise HTTPException(401, "Невалиден имейл или парола.", headers={"Cache-Control": "no-store"})

        token = create_session(db, user.id, request.cookies.get(COOKIE_NAME))
        result = CurrentUser.model_validate(user)

    # Пращаме бисквитката едва след успешен commit.
    response.set_cookie(
        key=COOKIE_NAME, value=token, max_age=SESSION_SECONDS,
        path="/", httponly=True, secure=COOKIE_SECURE, samesite="lax",
    )
    return result


@router.get("/me", response_model=CurrentUser)
def me(user: CurrentUser = Depends(get_current_user)):
    return user


@router.post("/logout", status_code=204)
def logout(request: Request):
    with SessionLocal.begin() as db:
        revoke_session(db, request.cookies.get(COOKIE_NAME))
    response = Response(status_code=204)
    no_cache(response)
    response.delete_cookie(
        key=COOKIE_NAME, path="/", httponly=True,
        secure=COOKIE_SECURE, samesite="lax",
    )
    return response
