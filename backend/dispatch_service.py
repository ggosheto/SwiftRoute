from backend.routing import distances_to_restaurant
from routing import reverse_graph, dijkstra
from road_network import get_nearest_node
courier_nodes = {
    1: "A",
    2: "B",
    3: "C"
}

def find_best_courier(graph, couriers, courier_nodes, restaurant_node):
    reversed_graph = reverse_graph(graph)

    distances_to_restaurant, previous_to_restaurant = dijkstra(reversed_graph, restaurant_node)

    best_courier = None
    best_time = float("inf")

    for courier in couriers:
        if courier.is_available:
            courier_node = courier_nodes[courier.id]
            travel_time = distances_to_restaurant[courier_node]

            if travel_time < best_time:
                best_time = travel_time
                best_courier = courier


    return best_courier

def find_best_courier_for_restaurant(road_network, graph, couriers, restaurant):
    restaurant_node = get_nearest_node(road_network, restaurant.latitude, restaurant.longitude)

    courier_nodes = {}

    for courier in couriers:
        if courier.is_available:
            courier_nodes[courier.id] = get_nearest_node(road_network, courier.latitude, courier.longitude)

    return find_best_courier(graph, couriers, courier_nodes, restaurant_node)