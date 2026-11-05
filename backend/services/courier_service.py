def get_available_couriers(couriers):
    available_couriers = []

    for courier in couriers:
        if courier.is_available:
            available_couriers.append(courier)

    return available_couriers

def get_courier_by_id(couriers, courier_id):
    for courier in couriers:
        if courier.id == courier_id:
            return courier
    return None

def update_courier_availability(couriers, courier_id, is_available):
    courier = get_courier_by_id(couriers, courier_id)

    if courier is None:
        return None

    courier.is_available = is_available
    return courier

def update_courier_location(couriers, courier_id, latitude, longitude):
    courier = get_courier_by_id(couriers, courier_id)

    if courier is None:
        return None

    courier.update_location(latitude, longitude)
    return courier