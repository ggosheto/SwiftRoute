from backend.routing.road_network import load_road_network, to_adjacency_dict, get_nearest_node, build_time_heuristic
from backend.routing.algorithms import dijkstra, reconstruct_path, a_star

road_network = load_road_network()
graph = to_adjacency_dict(road_network)

start_node = get_nearest_node(road_network, 42.14, 24.75)
end_node = get_nearest_node(road_network, 42.15, 24.76)

distances, previous = dijkstra(graph, start_node)

path = reconstruct_path(previous, start_node, end_node)

if not path:
    print("Няма маршрут.")
else:
    travel_time = distances[end_node]

    print("Маршрут:", path)
    print("Време в секунди:", round(travel_time, 2))
    print("Време в минути:", round(travel_time / 60, 2))

    total_time = 0

    for index in range(len(path) - 1):
        current_node = path[index]
        next_node = path[index + 1]
        total_time += graph[current_node][next_node]

    print("Сбор от времената на участъците:", round(total_time, 2))

    heuristic = build_time_heuristic(road_network, end_node)

    astar_path, astar_time = a_star(
        graph, start_node, end_node, heuristic
    )

    print("Маршрут с A*:", astar_path)
    print("Време с A*:", round(astar_time, 2))