from order import Order
from restaurant_service import get_restaurant_by_id

def create_order(orders, restaurants, restaurant_id, delivery_latitude, delivery_longitude):
    restaurant = get_restaurant_by_id(restaurants, restaurant_id)

    if restaurant is None:
        return None

    largest_id = 0

    for order in orders:
        if order.id > largest_id:
            largest_id = order.id

    new_id = largest_id + 1
    new_order = Order(new_id, restaurant_id, delivery_latitude,delivery_longitude)
    orders.append(new_order)

    return new_order

def get_order_by_id(orders, order_id):
    for order in orders:
        if order.id == order_id:
            return order
    return None

def assign_courier_to_order(order, courier):
    if order.status != "pending" or order.courier_id is not None:
        raise ValueError("Поръчката вече е възложена или не очаква куриер.")
    if not courier.is_available:
        raise ValueError("Куриерът не е свободен")
    order.courier_id = courier.id
    order.status = "assigned"
    courier.is_available = False

    return order

def update_order_status(order, courier, new_status):
    if order.courier_id is None:
        raise ValueError("Поръчката още няма възложен куриер.")

    if order.courier_id != courier.id:
        raise ValueError("Този куриер не е свързан с поръчката.")

    allowed_transitions = {
        "assigned": "accepted",
        "accepted": "picked_up",
        "picked_up": "delivered"
    }

    if order.status not in allowed_transitions:
        raise ValueError(
            f"Поръчка със статус '{order.status}' не може да премине напред."
        )

    expected_status = allowed_transitions[order.status]

    if new_status != expected_status:
        raise ValueError(
            f"След '{order.status}' е позволен само статус '{expected_status}'."
        )

    order.status = new_status
    courier.is_available = new_status == "delivered"

    return order