def get_restaurant_by_id(restaurants, restaurant_id):
    for restaurant in restaurants:
        if restaurant.id == restaurant_id:
            return restaurant
    return None