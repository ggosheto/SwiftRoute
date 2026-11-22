from fastapi import Depends, FastAPI, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.db_models import CourierRecord, OrderRecord, RestaurantRecord

from backend.schemas import (
    CourierAvailabilityUpdate,
    CourierLocationUpdate,
    CourierRead,
    OrderCreate,
    OrderRead,
    OrderStatusUpdate,
    RestaurantRead,
)

from backend.services.order_service import (
    assign_courier_to_order,
    update_order_status,
)
from backend.services.dispatch_service import find_best_courier_for_restaurant
from backend.services.route_service import (
    calculate_delivery_route,
    calculate_pickup_route,
)
from backend.routing.road_network import load_road_network, to_adjacency_dict


app = FastAPI(title="SwiftRoute")

road_network = load_road_network()
graph = to_adjacency_dict(road_network)

ACTIVE_STATUSES = ("assigned", "accepted", "picked_up")


@app.exception_handler(IntegrityError)
async def handle_integrity_error(request, error):
    return JSONResponse(
        status_code=409,
        content={
            "detail": (
                "Промяната противоречи на състоянието на данните. "
                "Обнови списъка."
            )
        },
    )


def require_record(db, model, record_id, message, lock=False):
    statement = select(model).where(model.id == record_id)

    if lock:
        statement = statement.with_for_update()

    record = db.scalar(statement)

    if record is None:
        raise HTTPException(status_code=404, detail=message)

    return record


@app.get("/couriers", response_model=list[CourierRead])
def read_couriers(db: Session = Depends(get_db)):
    return db.scalars(
        select(CourierRecord).order_by(CourierRecord.id)
    ).all()


@app.get("/couriers/available", response_model=list[CourierRead])
def read_available_couriers(db: Session = Depends(get_db)):
    return db.scalars(
        select(CourierRecord)
        .where(CourierRecord.is_available.is_(True))
        .order_by(CourierRecord.id)
    ).all()


@app.get("/couriers/{courier_id}", response_model=CourierRead)
def read_courier(courier_id: int, db: Session = Depends(get_db)):
    return require_record(
        db,
        CourierRecord,
        courier_id,
        "Куриерът не е намерен.",
    )


@app.patch(
    "/couriers/{courier_id}/availability",
    response_model=CourierRead,
)
def change_courier_availability(
    courier_id: int,
    data: CourierAvailabilityUpdate,
    db: Session = Depends(get_db),
):
    with db.begin():
        courier = require_record(
            db,
            CourierRecord,
            courier_id,
            "Куриерът не е намерен.",
            lock=True,
        )

        if data.is_available:
            active_order = db.scalar(
                select(OrderRecord.id)
                .where(
                    OrderRecord.courier_id == courier_id,
                    OrderRecord.status.in_(ACTIVE_STATUSES),
                )
                .limit(1)
            )

            if active_order is not None:
                raise HTTPException(
                    status_code=409,
                    detail=(
                        "Куриерът има активна поръчка "
                        "и не може да бъде освободен."
                    ),
                )

        courier.is_available = data.is_available

    return courier


@app.patch(
    "/couriers/{courier_id}/location",
    response_model=CourierRead,
)
def change_courier_location(
    courier_id: int,
    data: CourierLocationUpdate,
    db: Session = Depends(get_db),
):
    with db.begin():
        courier = require_record(
            db,
            CourierRecord,
            courier_id,
            "Куриерът не е намерен.",
            lock=True,
        )

        courier.latitude = data.latitude
        courier.longitude = data.longitude

    return courier


@app.get("/restaurants", response_model=list[RestaurantRead])
def read_restaurants(db: Session = Depends(get_db)):
    return db.scalars(
        select(RestaurantRecord).order_by(RestaurantRecord.id)
    ).all()


@app.get(
    "/restaurants/{restaurant_id}",
    response_model=RestaurantRead,
)
def read_restaurant(
    restaurant_id: int,
    db: Session = Depends(get_db),
):
    return require_record(
        db,
        RestaurantRecord,
        restaurant_id,
        "Ресторантът не е намерен.",
    )


@app.get("/orders", response_model=list[OrderRead])
def read_orders(db: Session = Depends(get_db)):
    return db.scalars(
        select(OrderRecord).order_by(OrderRecord.id)
    ).all()


@app.post("/orders", status_code=201, response_model=OrderRead)
def add_order(
    data: OrderCreate,
    db: Session = Depends(get_db),
):
    with db.begin():
        require_record(
            db,
            RestaurantRecord,
            data.restaurant_id,
            "Ресторантът не е намерен.",
        )

        order = OrderRecord(**data.model_dump())
        db.add(order)
        db.flush()

    return order


@app.get(
    "/restaurants/{restaurant_id}/recommended-courier",
    response_model=CourierRead,
)
def recommend_courier(
    restaurant_id: int,
    db: Session = Depends(get_db),
):
    restaurant = require_record(
        db,
        RestaurantRecord,
        restaurant_id,
        "Ресторантът не е намерен.",
    )

    couriers = db.scalars(
        select(CourierRecord).order_by(CourierRecord.id)
    ).all()

    courier = find_best_courier_for_restaurant(
        road_network,
        graph,
        couriers,
        restaurant,
    )

    if courier is None:
        raise HTTPException(
            status_code=404,
            detail=(
                "Няма свободен куриер, "
                "който може да достигне ресторанта."
            ),
        )

    return courier


@app.post("/orders/{order_id}/assign", response_model=OrderRead)
def assign_order(order_id: int, db: Session = Depends(get_db)):
    try:
        with db.begin():
            order = require_record(
                db,
                OrderRecord,
                order_id,
                "Поръчката не е намерена.",
                lock=True,
            )

            if order.status != "pending" or order.courier_id is not None:
                raise HTTPException(
                    status_code=409,
                    detail=(
                        "Поръчката вече е възложена "
                        "или не очаква куриер."
                    ),
                )

            restaurant = require_record(
                db,
                RestaurantRecord,
                order.restaurant_id,
                "Ресторантът не е намерен.",
            )

            couriers = db.scalars(
                select(CourierRecord)
                .order_by(CourierRecord.id)
                .with_for_update()
            ).all()

            courier = find_best_courier_for_restaurant(
                road_network,
                graph,
                couriers,
                restaurant,
            )

            if courier is None:
                raise HTTPException(
                    status_code=409,
                    detail=(
                        "Няма свободен куриер, "
                        "който може да достигне ресторанта."
                    ),
                )

            assign_courier_to_order(order, courier)

        return order

    except ValueError as error:
        raise HTTPException(
            status_code=409,
            detail=str(error),
        ) from error


@app.patch("/orders/{order_id}/status", response_model=OrderRead)
def change_order_status(
    order_id: int,
    data: OrderStatusUpdate,
    db: Session = Depends(get_db),
):
    try:
        with db.begin():
            order = require_record(
                db,
                OrderRecord,
                order_id,
                "Поръчката не е намерена.",
                lock=True,
            )

            if order.courier_id is None:
                raise HTTPException(
                    status_code=409,
                    detail="Първо трябва да бъде възложен куриер.",
                )

            courier = require_record(
                db,
                CourierRecord,
                order.courier_id,
                "Куриерът не е намерен.",
                lock=True,
            )

            update_order_status(order, courier, data.status)

        return order

    except ValueError as error:
        raise HTTPException(
            status_code=409,
            detail=str(error),
        ) from error


@app.get("/orders/{order_id}/route")
def get_order_route(
    order_id: int,
    db: Session = Depends(get_db),
):
    order = require_record(
        db,
        OrderRecord,
        order_id,
        "Поръчката не е намерена.",
    )

    restaurant = require_record(
        db,
        RestaurantRecord,
        order.restaurant_id,
        "Ресторантът не е намерен.",
    )

    route = calculate_delivery_route(
        road_network,
        graph,
        restaurant,
        order,
    )

    if route is None:
        raise HTTPException(
            status_code=409,
            detail="В пътната мрежа няма маршрут до адреса за доставка.",
        )

    return route

@app.get("/orders/{order_id}/pickup-route")
def get_order_pickup_route(
    order_id: int,
    db: Session = Depends(get_db),
):
    order = require_record(
        db,
        OrderRecord,
        order_id,
        "Поръчката не е намерена.",
    )

    if order.courier_id is None:
        raise HTTPException(
            status_code=409,
            detail="Първо назначи куриер към поръчката.",
        )

    if order.status not in ("assigned", "accepted"):
        raise HTTPException(
            status_code=409,
            detail=(
                "Маршрутът до ресторанта е достъпен само "
                "преди вземането на поръчката."
            ),
        )

    restaurant = require_record(
        db,
        RestaurantRecord,
        order.restaurant_id,
        "Ресторантът на поръчката не е намерен.",
    )

    courier = require_record(
        db,
        CourierRecord,
        order.courier_id,
        "Куриерът на поръчката не е намерен.",
    )

    route = calculate_pickup_route(
        road_network,
        graph,
        courier,
        restaurant,
        order,
    )

    if route is None:
        raise HTTPException(
            status_code=409,
            detail="В пътната мрежа няма маршрут от куриера до ресторанта.",
        )

    return route