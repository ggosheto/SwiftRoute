from pathlib import Path
import osmnx as ox

ox.settings.overpass_url = "https://ovp.dresel.systems/api"
ox.settings.log_console = True
ox.settings.use_cache = True

print("Изтегляне на пътната мрежа...")

road_network = ox.graph.graph_from_point(
    (42.143, 24.750),
    dist=2000,
    dist_type="bbox",
    network_type="drive"
)

road_network = ox.routing.add_edge_speeds(
    road_network,
    fallback=30
)

road_network = ox.routing.add_edge_travel_times(road_network)

data_directory = Path(__file__).resolve().parent / "data"
data_directory.mkdir(parents=True, exist_ok=True)

network_file = data_directory / "plovdiv_drive.graphml"
ox.io.save_graphml(road_network, filepath=network_file)

print("Върхове:", road_network.number_of_nodes())
print("Връзки:", road_network.number_of_edges())
print("Запазено в:", network_file)