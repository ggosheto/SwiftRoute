from pydantic import BaseModel, Field
from typing import Literal


class CourierAvailabilityUpdate(BaseModel):
    is_available: bool

class CourierLocationUpdate(BaseModel):
    latitude: float = Field(ge = -90, le = 90)
    longitude: float = Field(ge = -180, le = 180)

class OrderCreate(BaseModel):
    restaurant_id : int = Field(gt= 0)
    delivery_latitude : float = Field(ge=-90, le=90)
    delivery_longitude : float = Field(ge=-180, le=180)

class OrderStatusUpdate(BaseModel):
    status: Literal["accepted", "picked_up", "delivered"]