from backend.routing.road_network import get_nearest_node, build_time_heuristic
from backend.routing.algorithms import a_star

def calculate_delivery_route(road_network, graph, restaurant, order):
    start_node = get_nearest_node(road_network, restaurant.latitude, restaurant.longitude)
    end_node = get_nearest_node(road_network, order.delivery_latitude, order.delivery_longitude)

    heuristic = build_time_heuristic(road_network, end_node)
    path, travel_time = a_star(graph, start_node, end_node, heuristic)

    if not path:
        return None

    return {
        "order_id": order.id,
        "restaurant_id": restaurant.id,
        "node_ids": path,
        "travel_time_seconds": float(travel_time)
    }