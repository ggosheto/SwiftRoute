from fastapi import APIRouter, Depends, FastAPI, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.db.database import get_db
from backend.db.db_models import CourierRecord, OrderRecord, RestaurantRecord
from backend.routers.auth_router import router as auth_router
from backend.routers.registration_router import router as registration_router
from backend.routers.admin_router import router as admin_router
from backend.core.auth_dependencies import get_current_user, require_roles
from backend.schemas.auth_schemas import CurrentUser
from backend.core.permissions import visible_orders, visible_restaurants, visible_couriers, courier_can_work, restaurant_can_work

from backend.schemas.delivery import (
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
from backend.routing.service_area import (
    OutsideServiceAreaError, require_service_area, service_area_geojson,
)


app = FastAPI(title="SwiftRoute")


@app.exception_handler(OutsideServiceAreaError)
async def handle_outside_service_area(request, error):
    return JSONResponse(status_code=422, content={"detail": str(error)})


@app.get("/service-area", tags=["Покритие"])
def read_service_area():
    """Публична граница без лични данни; използва се и преди вход."""
    return service_area_geojson()


@app.get("/health", include_in_schema=False)
def health_check():
    """Process health only; does not verify PostgreSQL connectivity."""
    return {"status": "ok"}

app.include_router(auth_router)
app.include_router(registration_router)
app.include_router(admin_router)

# Всеки бизнес endpoint изисква валидна сесия.
business = APIRouter(dependencies=[Depends(get_current_user)])

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


def require_visible(db, statement, message, lock=False):
    if lock:
        statement = statement.with_for_update()
    record = db.scalar(statement)
    if record is None:
        raise HTTPException(status_code=404, detail=message)
    return record


def require_order(db, user, order_id, lock=False):
    return require_visible(
        db, visible_orders(user).where(OrderRecord.id == order_id),
        "Поръчката не е намерена.", lock=lock,
    )


def require_courier_owner(user, courier_id):
    if user.role != "admin" and user.courier_id != courier_id:
        raise HTTPException(status_code=403, detail="Можеш да променяш само собствения си куриерски профил.")


@business.get("/couriers", response_model=list[CourierRead])
def read_couriers(user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.scalars(
        visible_couriers(user).order_by(CourierRecord.id)
    ).all()


@business.get("/couriers/available", response_model=list[CourierRead])
def read_available_couriers(user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.scalars(
        visible_couriers(user)
        .where(CourierRecord.is_available.is_(True), courier_can_work())
        .order_by(CourierRecord.id)
    ).all()


@business.get("/couriers/{courier_id}", response_model=CourierRead)
def read_courier(courier_id: int, user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    return require_visible(
        db, visible_couriers(user).where(CourierRecord.id == courier_id),
        "Куриерът не е намерен.",
    )


@business.patch(
    "/couriers/{courier_id}/availability",
    response_model=CourierRead,
)
def change_courier_availability(
    courier_id: int,
    data: CourierAvailabilityUpdate,
    user: CurrentUser = Depends(require_roles("admin", "courier")), db: Session = Depends(get_db),
):
    require_courier_owner(user, courier_id)
    with db.begin():
        courier = require_record(
            db,
            CourierRecord,
            courier_id,
            "Куриерът не е намерен.",
            lock=True,
        )

        if data.is_available:
            require_service_area(courier.latitude, courier.longitude, "Местоположението на куриера")
            permitted = db.scalar(select(CourierRecord.id).where(
                CourierRecord.id == courier_id, courier_can_work(),
            ))
            if permitted is None:
                raise HTTPException(409, "Акаунтът на куриера не е одобрен или е деактивиран.")
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


@business.patch(
    "/couriers/{courier_id}/location",
    response_model=CourierRead,
)
def change_courier_location(
    courier_id: int,
    data: CourierLocationUpdate,
    user: CurrentUser = Depends(require_roles("admin", "courier")), db: Session = Depends(get_db),
):
    require_courier_owner(user, courier_id)
    with db.begin():
        courier = require_record(
            db,
            CourierRecord,
            courier_id,
            "Куриерът не е намерен.",
            lock=True,
        )

        require_service_area(data.latitude, data.longitude, "Местоположението на куриера")
        courier.latitude = data.latitude
        courier.longitude = data.longitude

    return courier


@business.get("/restaurants", response_model=list[RestaurantRead])
def read_restaurants(user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.scalars(
        visible_restaurants(user).order_by(RestaurantRecord.id)
    ).all()


@business.get(
    "/restaurants/{restaurant_id}",
    response_model=RestaurantRead,
)
def read_restaurant(
    restaurant_id: int,
    user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db),
):
    return require_visible(
        db, visible_restaurants(user).where(RestaurantRecord.id == restaurant_id),
        "Ресторантът не е намерен.",
    )


@business.get("/orders", response_model=list[OrderRead])
def read_orders(user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.scalars(
        visible_orders(user).order_by(OrderRecord.id)
    ).all()


@business.post("/orders", status_code=201, response_model=OrderRead)
def add_order(
    data: OrderCreate,
    user: CurrentUser = Depends(require_roles("admin", "restaurant")), db: Session = Depends(get_db),
):
    if user.role == "restaurant" and data.restaurant_id != user.restaurant_id:
        raise HTTPException(status_code=403, detail="Можеш да създаваш поръчки само за своя ресторант.")
    with db.begin():
        restaurant = require_visible(
            db, select(RestaurantRecord).where(RestaurantRecord.id == data.restaurant_id, restaurant_can_work()),
            "Ресторантът не е намерен.",
        )

        require_service_area(restaurant.latitude, restaurant.longitude, "Адресът на ресторанта")
        require_service_area(data.delivery_latitude, data.delivery_longitude, "Адресът за доставка")

        order = OrderRecord(**data.model_dump())
        db.add(order)
        db.flush()

    return order


@business.get(
    "/restaurants/{restaurant_id}/recommended-courier",
    response_model=CourierRead,
)
def recommend_courier(
    restaurant_id: int,
    user: CurrentUser = Depends(require_roles("admin", "restaurant")), db: Session = Depends(get_db),
):
    restaurant = require_visible(
        db, visible_restaurants(user).where(RestaurantRecord.id == restaurant_id),
        "Ресторантът не е намерен.",
    )

    couriers = db.scalars(
        select(CourierRecord).where(courier_can_work()).order_by(CourierRecord.id)
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


@business.post("/orders/{order_id}/assign", response_model=OrderRead)
def assign_order(order_id: int, user: CurrentUser = Depends(require_roles("admin", "restaurant")), db: Session = Depends(get_db)):
    try:
        with db.begin():
            order = require_order(db, user, order_id, lock=True)

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

            # Проверяваме и стари поръчки, преди да резервираме куриер.
            require_service_area(order.delivery_latitude, order.delivery_longitude, "Адресът за доставка")

            couriers = db.scalars(
                select(CourierRecord)
                .where(courier_can_work())
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


@business.patch("/orders/{order_id}/status", response_model=OrderRead)
def change_order_status(
    order_id: int,
    data: OrderStatusUpdate,
    user: CurrentUser = Depends(require_roles("admin", "courier")), db: Session = Depends(get_db),
):
    try:
        with db.begin():
            order = require_order(db, user, order_id, lock=True)

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


@business.get("/orders/{order_id}/route")
def get_order_route(
    order_id: int,
    user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db),
):
    order = require_order(db, user, order_id)

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

@business.get("/orders/{order_id}/pickup-route")
def get_order_pickup_route(
    order_id: int,
    user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db),
):
    order = require_order(db, user, order_id)

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

@business.get("/orders/{order_id}", response_model=OrderRead)
def read_order(order_id: int, user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    return require_order(db, user, order_id)


app.include_router(business)
