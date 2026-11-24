from sqlalchemy import select, text

from backend.db.database import Base, SessionLocal, engine
from backend.db.db_models import CourierRecord, RestaurantRecord


def main():
    try:
        with SessionLocal.begin() as db:
            db.execute(
                text("SELECT pg_advisory_xact_lock(170017)")
            )

            Base.metadata.create_all(db.connection())

            if db.scalar(select(RestaurantRecord.id).limit(1)) is None:
                db.add_all([
                    RestaurantRecord(
                        name="Демо ресторант Център",
                        latitude=42.145,
                        longitude=24.750,
                    ),
                    RestaurantRecord(
                        name="Демо ресторант Юг",
                        latitude=42.130,
                        longitude=24.755,
                    ),
                ])

            if db.scalar(select(CourierRecord.id).limit(1)) is None:
                db.add_all([
                    CourierRecord(
                        name="Иван",
                        latitude=42.14,
                        longitude=24.75,
                        is_available=True,
                    ),
                    CourierRecord(
                        name="Желязко",
                        latitude=42.15,
                        longitude=24.76,
                        is_available=True,
                    ),
                    CourierRecord(
                        name="Петя",
                        latitude=42.16,
                        longitude=24.77,
                        is_available=False,
                    ),
                ])

        print("Таблиците и началните данни са готови.")

    finally:
        engine.dispose()


if __name__ == "__main__":
    main()