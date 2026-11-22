from backend.routing.road_network import get_nearest_node, build_time_heuristic, build_route_geometry
from backend.routing.algorithms import a_star, reverse_graph, dijkstra

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
        "travel_time_seconds": float(travel_time),
        "geometry": build_route_geometry(road_network, path)
    }

def calculate_pickup_route(road_network, graph, courier, restaurant, order):
    courier_node = get_nearest_node(
        road_network,
        courier.latitude,
        courier.longitude,
    )
    restaurant_node = get_nearest_node(
        road_network,
        restaurant.latitude,
        restaurant.longitude,
    )

    reversed_graph = reverse_graph(graph)

    distances, previous = dijkstra(
        reversed_graph,
        restaurant_node,
    )

    travel_time = distances.get(courier_node, float("inf"))

    if travel_time == float("inf"):
        return None

    path = []
    current = courier_node

    while current is not None:
        path.append(current)

        if current == restaurant_node:
            break

        current = previous[current]

    if not path or path[-1] != restaurant_node:
        return None

    if len(path) == 1:
        node = road_network.nodes[path[0]]
        position = [float(node["x"]), float(node["y"])]

        geometry = {
            "type": "LineString",
            "coordinates": [position, position.copy()],
        }
    else:
        geometry = build_route_geometry(road_network, path)

    return {
        "order_id": order.id,
        "restaurant_id": restaurant.id,
        "courier_id": courier.id,
        "node_ids": path,
        "travel_time_seconds": float(travel_time),
        "geometry": geometry,
    }