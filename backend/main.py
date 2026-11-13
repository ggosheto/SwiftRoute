from backend.models.courier import Courier
from backend.services.courier_service import get_available_couriers, get_courier_by_id
from fastapi import FastAPI, HTTPException
from backend.schemas import CourierAvailabilityUpdate, CourierLocationUpdate, OrderCreate, OrderStatusUpdate
from backend.services.courier_service import update_courier_availability, update_courier_location
from backend.models.restaurant import Restaurant
from backend.services.restaurant_service import get_restaurant_by_id
from backend.services.order_service import create_order, get_order_by_id, assign_courier_to_order, update_order_status
from backend.routing.road_network import load_road_network, to_adjacency_dict
from backend.services.dispatch_service import find_best_courier_for_restaurant
from backend.services.route_service import calculate_delivery_route

app = FastAPI(title="SwiftRoute")

road_network = load_road_network()
graph = to_adjacency_dict(road_network)

couriers = [
    Courier(1, "Иван", 42.14, 24.75, True),
    Courier(2, "Желязко", 42.15, 24.76, True),
    Courier(3, "Петя", 42.16, 24.77, False)
]

restaurants = [
    Restaurant(1, "Демо ресторант Център", 42.145, 24.750),
    Restaurant(2, "Демо ресторант Юг", 42.130, 24.755),
]

orders = []

@app.get("/couriers/available")
def read_available_couriers():
    available_couriers = get_available_couriers(couriers)
    return available_couriers

@app.get("/couriers")
def read_couriers():
    return couriers

@app.get("/couriers/{courier_id}")
def read_courier(courier_id: int):
    courier_by_id = get_courier_by_id(couriers, courier_id)

    if courier_by_id == None:
        raise HTTPException(
            status_code=404,
            detail="Куриерът не е намерен."
        )

    return courier_by_id

@app.patch("/couriers/{courier_id}/availability")
def change_courier_availability(courier_id: int, data: CourierAvailabilityUpdate):
    if data.is_available:
        for order in orders:
            if (
                order.courier_id == courier_id
                and order.status in ("assigned", "accepted", "picked_up")
            ):
                raise HTTPException(
                    status_code=409,
                    detail="Куриерът има активна поръчка и не може да бъде освободен."
                )

    updated_courier = update_courier_availability(couriers, courier_id, data.is_available)

    if updated_courier is None:
        raise HTTPException(
            status_code=404,
            detail="Куриерът не е намерен."
        )
    else:
        return updated_courier

@app.patch("/couriers/{courier_id}/location")
def change_courier_location(
    courier_id: int,
    data: CourierLocationUpdate
):
    updated_courier = update_courier_location(couriers, courier_id, data.latitude, data.longitude)

    if updated_courier is None:
        raise HTTPException(
            status_code=404,
            detail="Куриерът не е намерен."
        )

    return updated_courier

@app.get("/restaurants")
def read_restaurants():
    return restaurants


@app.get("/restaurants/{restaurant_id}")
def read_restaurant(restaurant_id: int):
    restaurant = get_restaurant_by_id(restaurants, restaurant_id)

    if restaurant is None:
        raise HTTPException(
            status_code=404,
            detail="Ресторантът не е намерен."
        )

    return restaurant

@app.post("/orders", status_code=201)
def add_order(data : OrderCreate):
    new_order = create_order(orders, restaurants, data.restaurant_id, data.delivery_latitude, data.delivery_longitude)

    if new_order is None:
        raise HTTPException(
            status_code=404,
            detail="Ресторантът не е намерен."
        )
    return new_order

@app.get("/orders")
def get_order():
    return orders

@app.get("/restaurants/{restaurant_id}/recommended-courier")
def recommend_courier(restaurant_id : int):
    restaurant = get_restaurant_by_id(restaurants, restaurant_id)
    if restaurant is None:
        raise HTTPException(
            status_code=404,
            detail="Ресторантът не е намерен."
        )

    best_courier = find_best_courier_for_restaurant(road_network, graph, couriers, restaurant)
    if best_courier is None:
        raise HTTPException(
            status_code=404,
            detail="Няма свободен куриер, който може да достигне ресторанта."
        )
    return best_courier

@app.post("/orders/{order_id}/assign")
def assign_order(order_id: int):
    order = get_order_by_id(orders, order_id)
    if order is None:
        raise HTTPException(
            status_code=404,
            detail = "Поръчката не е намерена"
        )
    if order.status != "pending" or order.courier_id is not None:
        raise HTTPException(
            status_code=409,
            detail = "Поръчката вече е възложена или не очаква куриер."
        )

    restaurant = get_restaurant_by_id(restaurants, order.restaurant_id)

    if restaurant is None:
        raise HTTPException(
            status_code=404,
            detail="Ресторантът на поръчката не е намерен."
        )

    best_courier = find_best_courier_for_restaurant(road_network, graph, couriers, restaurant)
    if best_courier is None:
        raise HTTPException(
            status_code=409,
            detail="Няма намерен свободен куриер."
        )

    try:
        courier_to_order = assign_courier_to_order(order, best_courier)
        return courier_to_order
    except ValueError as error:
        raise HTTPException(
            status_code=409,
            detail=str(error)
        )

@app.patch("/orders/{order_id}/status")
def change_order_status(order_id: int, data: OrderStatusUpdate):
    order = get_order_by_id(orders, order_id)

    if order is None:
        raise HTTPException(
            status_code=404,
            detail="Поръчката не е намерена."
        )

    if order.courier_id is None:
        raise HTTPException(
            status_code=409,
            detail="Първо трябва да бъде възложен куриер."
        )

    courier = get_courier_by_id(couriers, order.courier_id)

    if courier is None:
        raise HTTPException(
            status_code=409,
            detail="Куриерът, свързан с поръчката, не е намерен."
        )

    try:
        return update_order_status(order, courier, data.status)
    except ValueError as error:
        raise HTTPException(
            status_code=409,
            detail=str(error)
        )

@app.get("/orders/{order_id}/route")
def get_order_route(order_id: int):
    order = get_order_by_id(orders, order_id)
    if order is None:
        raise HTTPException(
            status_code=404,
            detail="Поръчката не е намерена"
        )

    restaurant = get_restaurant_by_id(restaurants, order.restaurant_id)
    if restaurant is None:
        raise HTTPException(
            status_code=404,
            detail="Ресторантът на поръчката не е намерен."
        )

    route = calculate_delivery_route(road_network, graph, restaurant, order)
    if route is None:
        raise HTTPException(
            status_code=409,
            detail = "В пътната мрежа няма маршрут от ресторанта до адреса за доставка."
        )
    return route