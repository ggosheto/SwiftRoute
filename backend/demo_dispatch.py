from inspect import FullArgSpec

from courier import Courier
from routing import graph
from dispatch_service import find_best_courier

courier1 = Courier(1, 'Иван', 42.14, 24.75, False)
courier2 = Courier(2, 'Петър', 42.15, 24.76, False)
courier3 = Courier(3, 'Петя', 42.16, 24.77, False)

couriers = [courier1, courier2, courier3]

courier_node = {
    1 : "A",
    2 : "B",
    3 : "C"
}

best_courier = find_best_courier(graph, couriers,courier_node, "D")
print("Няма подходящ свободен куриер." if best_courier is None else f"{best_courier.name}")