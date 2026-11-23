"""По избор: изтрива изтеклите сесии, без да променя акаунтите."""

from datetime import datetime, timezone

from sqlalchemy import delete

from backend.database import SessionLocal
from backend.session_models import SessionRecord


def main():
    with SessionLocal.begin() as db:
        result = db.execute(delete(SessionRecord).where(
            SessionRecord.expires_at <= datetime.now(timezone.utc)
        ))
        count = result.rowcount
    print(f"Изтрити изтекли сесии: {count}")


if __name__ == "__main__":
    main()
