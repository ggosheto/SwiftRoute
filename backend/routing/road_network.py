from pathlib import Path
import osmnx as ox


def load_road_network():
    network_file = (
            Path(__file__).resolve().parent.parent
            / "data"
            / "plovdiv_drive.graphml"
    )

    return ox.io.load_graphml(filepath=network_file)

def to_adjacency_dict(road_network):
    graph = {}

    for node in road_network.nodes:
        graph[node] = {}

    for start_node, end_node, data in road_network.edges(data=True):
        travel_time = data["travel_time"]

        if (
            end_node not in graph[start_node]
            or travel_time < graph[start_node][end_node]
        ):
            graph[start_node][end_node] = travel_time

    return graph

def get_nearest_node(road_network, latitude, longitude):
    return int(
        ox.distance.nearest_nodes(
            road_network,
            X=longitude,
            Y=latitude
        )
    )

def build_time_heuristic(road_network, goal):
    max_speed_kph = 0

    for start_node, end_node, data in road_network.edges(data=True):
        if data["speed_kph"] > max_speed_kph:
            max_speed_kph = data["speed_kph"]

    max_speed_mps = max_speed_kph / 3.6
    goal_data = road_network.nodes[goal]

    heuristic = {}

    for node, data in road_network.nodes(data = True):
        distance_meters = ox.distance.great_circle(
            data["y"],
            data["x"],
            goal_data["y"],
            goal_data["x"]
        )

        heuristic[node] = distance_meters / max_speed_mps

    return heuristic

def build_route_geometry(road_network, path):
    if not path:
        return None

    if len(path) == 1:
        node = road_network.nodes[path[0]]
        return {
            "type": "Point",
            "coordinates": [node["x"], node["y"]]
        }

    segments = ox.routing.route_to_gdf(
        road_network, path, weight="travel_time"
    )

    coordinates = []

    for geometry in segments.geometry:
        for longitude, latitude in geometry.coords:
            point = [longitude, latitude]

            if not coordinates or point != coordinates[-1]:
                coordinates.append(point)

    return {
        "type": "LineString",
        "coordinates": coordinates
    }

if __name__ == "__main__":
    road_network = load_road_network()
    graph = to_adjacency_dict(road_network)

    print("Върхове в оригиналната мрежа:", road_network.number_of_nodes())
    print("Върхове в речника:", len(graph))

    connections = 0
    for neighbors in graph.values():
        connections += len(neighbors)

    print("Връзки в речника:", connections)