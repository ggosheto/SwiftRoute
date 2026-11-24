"""Хеширане и проверка на пароли; без връзка с базата данни."""

from pwdlib import PasswordHash
from pwdlib.exceptions import UnknownHashError
from pwdlib.hashers.argon2 import Argon2Hasher


MIN_PASSWORD_LENGTH = 6
MAX_PASSWORD_LENGTH = 128

# Argon2Hasher използва Argon2id и генерира случайна salt стойност.
password_hasher = PasswordHash((Argon2Hasher(),))


def validate_password(password: str) -> None:
    if not MIN_PASSWORD_LENGTH <= len(password) <= MAX_PASSWORD_LENGTH:
        raise ValueError(
            f"Паролата трябва да съдържа между {MIN_PASSWORD_LENGTH} "
            f"и {MAX_PASSWORD_LENGTH} знака."
        )
    if not password.strip():
        raise ValueError("Паролата не може да съдържа само интервали.")


def hash_password(password: str) -> str:
    validate_password(password)
    # Не премахваме интервали и не променяме регистъра на паролата.
    return password_hasher.hash(password)


def verify_password(password: str, stored_hash: str) -> bool:
    if not password or len(password) > MAX_PASSWORD_LENGTH:
        return False
    try:
        return password_hasher.verify(password, stored_hash)
    except UnknownHashError:
        return False
