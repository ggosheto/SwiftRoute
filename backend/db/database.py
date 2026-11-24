import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import URL, create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker


PROJECT_ROOT = Path(__file__).resolve().parents[2]

load_dotenv(
    PROJECT_ROOT / ".env",
    interpolate=False,
)


def required_setting(name):
    value = os.getenv(name)

    if value is None or value == "":
        raise RuntimeError(
            f"Липсва настройка {name}. Провери .env файла."
        )

    return value


database_url = URL.create(
    drivername="postgresql+psycopg",
    username=required_setting("DB_USER"),
    password=required_setting("DB_PASSWORD"),
    host=required_setting("DB_HOST"),
    port=int(required_setting("DB_PORT")),
    database=required_setting("DB_NAME"),
)

connection_options = {"connect_timeout": 10}
# Locally, preserve psycopg defaults. For hosted PostgreSQL set DB_SSLMODE=require.
ssl_mode = os.getenv("DB_SSLMODE", "").strip()
if ssl_mode:
    if ssl_mode not in {"disable", "allow", "prefer", "require", "verify-ca", "verify-full"}:
        raise RuntimeError("Невалидна настройка DB_SSLMODE.")
    connection_options["sslmode"] = ssl_mode

engine = create_engine(
    database_url,
    pool_pre_ping=True,
    connect_args=connection_options,
)

SessionLocal = sessionmaker(
    bind=engine,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


def get_db():
    with SessionLocal() as session:
        yield session