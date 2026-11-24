"""Настройки, проверка на сесията и основа за контрол на достъпа."""

import os
from urllib.parse import urlsplit

from fastapi import Depends, HTTPException, Request, Response

# database зарежда .env преди да прочетем AUTH_* настройките по-долу.
from backend.db.database import SessionLocal
from backend.schemas.auth_schemas import CurrentUser
from services.session_service import find_session_user


COOKIE_NAME = "swiftroute_session"
_secure_setting = os.getenv("AUTH_COOKIE_SECURE", "false").strip().lower()
if _secure_setting not in {"true", "false"}:
    raise RuntimeError("AUTH_COOKIE_SECURE трябва да бъде true или false.")
COOKIE_SECURE = _secure_setting == "true"


def normalized_origin(value: str) -> str:
    parts = urlsplit(value)
    if (
        parts.scheme not in {"http", "https"}
        or not parts.hostname
        or parts.username is not None
        or parts.password is not None
        or parts.query
        or parts.fragment
        or parts.path not in {"", "/"}
    ):
        raise ValueError("Невалиден origin.")
    port = parts.port
    host = parts.hostname.lower()
    if ":" in host:
        host = f"[{host}]"
    suffix = "" if port is None or port == (443 if parts.scheme == "https" else 80) else f":{port}"
    return f"{parts.scheme}://{host}{suffix}"


_origins = os.getenv(
    "AUTH_ALLOWED_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173,"
    "http://localhost:8000,http://127.0.0.1:8000",
)
ALLOWED_ORIGINS = frozenset(normalized_origin(item.strip()) for item in _origins.split(","))


def no_cache(response: Response) -> None:
    response.headers["Cache-Control"] = "no-store"
    response.headers["Vary"] = "Cookie"


def check_request_origin(request: Request) -> None:
    """Проверка срещу CSRF за заявки, които променят състоянието.

    Липсващ Origin е допустим за CLI клиенти. Браузърните cross-site
    заявки без Origin се отказват чрез Sec-Fetch-Site/Referer.
    """
    if request.method in {"GET", "HEAD", "OPTIONS"}:
        return
    origin = request.headers.get("origin")
    if origin is None:
        referer = request.headers.get("referer")
        if referer:
            try:
                parts = urlsplit(referer)
                origin = f"{parts.scheme}://{parts.netloc}"
            except ValueError:
                origin = "null"
        elif request.headers.get("sec-fetch-site") in {"cross-site", "same-site"}:
            origin = "null"
        else:
            return
    try:
        allowed = normalized_origin(origin) in ALLOWED_ORIGINS
    except ValueError:
        allowed = False
    if not allowed:
        raise HTTPException(403, "Заявката идва от недопустим уеб адрес.", headers={"Cache-Control": "no-store"})


def get_current_user(request: Request, response: Response) -> CurrentUser:
    check_request_origin(request)
    no_cache(response)
    # Отделна кратка DB сесия: не стартира транзакция в Depends(get_db)
    # на бизнес endpoint-а, който вече използва with db.begin().
    with SessionLocal() as db:
        user = find_session_user(db, request.cookies.get(COOKIE_NAME))
        if user is None:
            raise HTTPException(401, "Необходимо е да влезеш в акаунта си.", headers={"Cache-Control": "no-store"})
        return CurrentUser.model_validate(user)


def require_roles(*roles: str):
    """Проверява роля. Собствеността върху конкретната поръчка се проверява отделно."""
    if not roles or not set(roles) <= {"admin", "restaurant", "courier"}:
        raise ValueError("Задай поне една валидна роля.")

    def dependency(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if user.role not in roles:
            raise HTTPException(403, "Нямаш право на това действие.", headers={"Cache-Control": "no-store"})
        return user

    return dependency
