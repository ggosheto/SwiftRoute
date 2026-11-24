from sqlalchemy import text

from backend.db.database import engine


def main():
    try:
        with engine.connect() as connection:
            result = connection.execute(
                text(
                    "SELECT current_database() AS database_name, "
                    "current_user AS username"
                )
            ).mappings().one()

            print("Успешна връзка с PostgreSQL.")
            print(f"База: {result['database_name']}")
            print(f"Потребител: {result['username']}")
    finally:
        engine.dispose()


if __name__ == "__main__":
    main()