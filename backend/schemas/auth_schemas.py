from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, SecretStr


class LoginRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: str = Field(min_length=3, max_length=254)
    password: SecretStr = Field(min_length=1, max_length=128)


class CurrentUser(BaseModel):
    model_config = ConfigDict(from_attributes=True, frozen=True)

    id: int
    email: str
    role: Literal["admin", "restaurant", "courier"]
    restaurant_id: int | None
    courier_id: int | None
    is_active: bool
