import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import URL, create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker


PROJECT_ROOT = Path(__file__).resolve().parent.parent

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

engine = create_engine(
    database_url,
    pool_pre_ping=True,
    connect_args={"connect_timeout": 10},
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