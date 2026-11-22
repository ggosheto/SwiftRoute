"""Стартиране от корена: python -m backend.scripts.user_accounts --help."""

import argparse
import getpass
import sys
import warnings

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError, OperationalError, ProgrammingError

from backend.auth_models import UserRecord
from backend.database import SessionLocal
from backend.db_models import CourierRecord, RestaurantRecord
from backend.security import validate_password
from backend.services.user_service import create_user, normalize_email, validate_role_links


def read_password() -> str:
    # Ако конзолата не поддържа скрито въвеждане, спираме преди четенето.
    with warnings.catch_warnings():
        warnings.simplefilter("error", getpass.GetPassWarning)
        try:
            password = getpass.getpass("Парола (6–128 знака; въвеждането е скрито): ")
            validate_password(password)
            confirmation = getpass.getpass("Повтори паролата: ")
        except getpass.GetPassWarning as error:
            raise ValueError(
                "Тази конзола не поддържа скрито въвеждане. "
                "Изпълни командата в PowerShell или в раздел Terminal на PyCharm."
            ) from error
    if password != confirmation:
        raise ValueError("Двете пароли не съвпадат. Акаунтът не е създаден.")
    return password


def show_profiles() -> None:
    with SessionLocal() as db:
        restaurants = db.scalars(select(RestaurantRecord).order_by(RestaurantRecord.id)).all()
        couriers = db.scalars(select(CourierRecord).order_by(CourierRecord.id)).all()

        print("РЕСТОРАНТИ — номер | име")
        for restaurant in restaurants:
            print(f"{restaurant.id} | {restaurant.name}")
        if not restaurants:
            print("Няма ресторанти.")

        print("\nКУРИЕРИ — номер | име")
        for courier in couriers:
            print(f"{courier.id} | {courier.name}")
        if not couriers:
            print("Няма куриери.")


def show_users() -> None:
    with SessionLocal() as db:
        # Избираме само безопасните за показване полета, без password_hash.
        rows = db.execute(
            select(
                UserRecord.id,
                UserRecord.email,
                UserRecord.role,
                UserRecord.restaurant_id,
                UserRecord.courier_id,
                UserRecord.is_active,
            ).order_by(UserRecord.id)
        ).all()

        if not rows:
            print("Все още няма акаунти.")
            return
        print("номер | имейл | роля | ресторант | куриер | активен")
        for user in rows:
            print(
                f"{user.id} | {user.email} | {user.role} | "
                f"{user.restaurant_id if user.restaurant_id is not None else '-'} | "
                f"{user.courier_id if user.courier_id is not None else '-'} | "
                f"{'да' if user.is_active else 'не'}"
            )


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Управление на акаунтите в SwiftRoute.")
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("profiles", help="Показва номерата на ресторантите и куриерите.")
    commands.add_parser("list", help="Показва акаунтите без пароли и хешове.")

    create = commands.add_parser("create", help="Създава акаунт; паролата се въвежда скрито.")
    create.add_argument("--email", required=True)
    create.add_argument("--role", required=True, choices=("admin", "restaurant", "courier"))
    create.add_argument("--restaurant-id", type=int)
    create.add_argument("--courier-id", type=int)

    args = parser.parse_args(argv)
    try:
        if args.command == "profiles":
            show_profiles()
        elif args.command == "list":
            show_users()
        else:
            email = normalize_email(args.email)
            validate_role_links(args.role, args.restaurant_id, args.courier_id)
            password = read_password()
            with SessionLocal.begin() as db:
                user = create_user(
                    db, email, password, args.role,
                    restaurant_id=args.restaurant_id,
                    courier_id=args.courier_id,
                )
                user_id = user.id
            print(f"Създаден акаунт №{user_id}: {email} | роля: {args.role}")
        return 0
    except ValueError as error:
        print(f"Грешка: {error}", file=sys.stderr)
    except IntegrityError:
        # Ограниченията в базата пазят и при две едновременни създавания.
        print(
            "Записът е отказан: имейлът или куриерът вече е използван, "
            "или свързаният профил е променен. Обнови списъците.",
            file=sys.stderr,
        )
    except OperationalError:
        print(
            "Няма работеща връзка с базата. Провери PostgreSQL и изпълни "
            "python -m backend.scripts.check_database.",
            file=sys.stderr,
        )
    except ProgrammingError:
        print(
            "Базата отказа заявката. Провери дали използваш правилната база, "
            "дали миграцията е приложена и дали потребителят има права върху таблиците.",
            file=sys.stderr,
        )
    except (EOFError, KeyboardInterrupt):
        print("\nОперацията е прекъсната.", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
