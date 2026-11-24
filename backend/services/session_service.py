"""Операции със сесии; извикващият управлява транзакцията."""

import hashlib
import re
import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from db.auth_models import UserRecord
from db.session_models import SessionRecord


SESSION_SECONDS = 8 * 60 * 60
TOKEN_PATTERN = re.compile(r"[A-Za-z0-9_-]{43}")


def token_digest(token: str | None) -> str | None:
    if token is None or TOKEN_PATTERN.fullmatch(token) is None:
        return None
    return hashlib.sha256(token.encode("ascii")).hexdigest()


def revoke_session(db: Session, token: str | None) -> None:
    digest = token_digest(token)
    if digest is not None:
        db.execute(delete(SessionRecord).where(SessionRecord.token_hash == digest))


def create_session(db: Session, user_id: int, previous_token: str | None) -> str:
    # Успешният вход сменя токена, включително при вход с друг акаунт.
    revoke_session(db, previous_token)
    now = datetime.now(timezone.utc)
    token = secrets.token_urlsafe(32)
    db.add(SessionRecord(
        token_hash=token_digest(token),
        user_id=user_id,
        created_at=now,
        expires_at=now + timedelta(seconds=SESSION_SECONDS),
    ))
    db.flush()
    return token


def find_session_user(db: Session, token: str | None) -> UserRecord | None:
    digest = token_digest(token)
    if digest is None:
        return None
    # Четем ролята и активността от users при всяка заявка, не от бисквитката.
    return db.scalar(
        select(UserRecord)
        .join(SessionRecord, SessionRecord.user_id == UserRecord.id)
        .where(
            SessionRecord.token_hash == digest,
            SessionRecord.expires_at > datetime.now(timezone.utc),
            UserRecord.is_active.is_(True),
            UserRecord.approval_status == "approved",
        )
    )
