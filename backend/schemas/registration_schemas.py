from typing import Literal, Self
from pydantic import BaseModel, ConfigDict, Field, SecretStr, field_validator, model_validator
from backend.services.user_service import normalize_email


class RegisterRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: str = Field(min_length=3, max_length=254)
    password: SecretStr = Field(min_length=10, max_length=128)
    password_confirmation: SecretStr = Field(min_length=10, max_length=128)
    role: Literal["restaurant", "courier"]
    name: str = Field(min_length=2, max_length=200)
    latitude: float = Field(ge=-90, le=90, allow_inf_nan=False)
    longitude: float = Field(ge=-180, le=180, allow_inf_nan=False)

    @field_validator("email")
    @classmethod
    def email_address(cls, value: str) -> str:
        return normalize_email(value)

    @field_validator("name")
    @classmethod
    def profile_name(cls, value: str) -> str:
        value = value.strip()
        if len(value) < 2:
            raise ValueError("Името трябва да съдържа поне 2 знака.")
        return value

    @model_validator(mode="after")
    def passwords_match(self) -> Self:
        password = self.password.get_secret_value()
        if not password.strip():
            raise ValueError("Паролата не може да съдържа само интервали.")
        if password != self.password_confirmation.get_secret_value():
            raise ValueError("Двете пароли не съвпадат.")
        return self


class RegistrationResult(BaseModel):
    message: str
    approval_status: Literal["pending"] = "pending"


class AdminUserRead(BaseModel):
    id: int
    email: str
    role: Literal["admin", "restaurant", "courier"]
    approval_status: Literal["pending", "approved"]
    is_active: bool
    restaurant_id: int | None
    courier_id: int | None
    name: str | None
    latitude: float | None
    longitude: float | None


class AdminUsersPage(BaseModel):
    items: list[AdminUserRead]
    total: int


class UserActivationUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    is_active: bool = Field(strict=True)
