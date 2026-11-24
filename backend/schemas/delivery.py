from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class CourierAvailabilityUpdate(BaseModel):
    is_available: bool


class CourierLocationUpdate(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)


class OrderCreate(BaseModel):
    restaurant_id: int = Field(gt=0)
    delivery_latitude: float = Field(ge=-90, le=90)
    delivery_longitude: float = Field(ge=-180, le=180)


class OrderStatusUpdate(BaseModel):
    status: Literal["accepted", "picked_up", "delivered"]


class RestaurantRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    latitude: float
    longitude: float


class CourierRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    latitude: float
    longitude: float
    is_available: bool


class OrderRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    restaurant_id: int
    delivery_latitude: float
    delivery_longitude: float
    courier_id: int | None
    status: Literal[
        "pending",
        "assigned",
        "accepted",
        "picked_up",
        "delivered",
    ]