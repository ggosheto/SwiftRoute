graph = {
    "A": {"B": 4, "C": 2},
    "B": {"C": 1, "D": 5},
    "C": {"D": 8},
    "D": {}
}

def dijkstra(graph, start):
    distances = {}
    previous = {}

    for node in graph:
        distances[node] = float("inf")
        previous[node] = None

    distances[start] = 0
    visited = set()

    while True:
        current = None
        smallest_distance = float("inf")

        for node in graph:
            if node not in visited and distances[node] < smallest_distance:
                current = node
                smallest_distance = distances[node]

        if current is None:
            break

        for neighbor, weight in graph[current].items():
            new_distance = distances[current] + weight

            if new_distance < distances[neighbor]:
                distances[neighbor] = new_distance
                previous[neighbor] = current

        visited.add(current)

    return distances, previous


def a_star(graph, start, goal, heuristic):
    g_scores = {}
    f_scores = {}
    previous = {}

    for node in graph:
        g_scores[node] = float("inf")
        f_scores[node] = float("inf")
        previous[node] = None

    g_scores[start] = 0
    f_scores[start] = heuristic[start]

    open_set = {start}

    while open_set:
        current = None
        smallest_score = float("inf")

        for node in open_set:
            if f_scores[node] < smallest_score:
                current = node
                smallest_score = f_scores[node]

        if current == goal:
            return reconstruct_path(previous, start, goal), g_scores[goal]

        open_set.remove(current)

        for neighbor, weight in graph[current].items():
            tentative_g = g_scores[current] + weight

            if tentative_g < g_scores[neighbor]:
                previous[neighbor] = current
                g_scores[neighbor] = tentative_g
                f_scores[neighbor] = tentative_g + heuristic[neighbor]

                open_set.add(neighbor)

    return [], float("inf")

def reconstruct_path(previous, start, end):
    path = []
    current = end

    while current is not None:
        path.append(current)
        current = previous[current]

    path.reverse()

    if path[0] != start:
        return []
    else:
        return path

distances, previous = dijkstra(graph, "A")
#print(reconstruct_path(previous, "A", "D"))

def reverse_graph(graph):
    reversed_graph = {}

    for node in graph:
        reversed_graph[node] = {}

    for node in graph:
        for neighbor, weight in graph[node].items():
            reversed_graph[neighbor][node] = weight

    return reversed_graph

#print(reverse_graph(graph))

reversed_graph = reverse_graph(graph)

distances_to_restaurant, previous_to_restaurant = dijkstra(reversed_graph, "D")

#print(distances_to_restaurant)

heuristic = {
    "A": 8,
    "B": 5,
    "C": 8,
    "D": 0
}

path, travel_time = a_star(graph, "D", "A", heuristic)

if __name__ == "__main__":
    print("Маршрут:", path)
    print("Време:", travel_time)