"""Демо зона, съответстваща на bbox на plovdiv_drive.graphml.

Мрежата е изтеглена около (42.143, 24.750), dist=2000, dist_type='bbox'.
Това са граници за приемане на адреси, не гаранция за достижим път.
При смяна на покритието актуализирайте и GraphML файла, и тези граници.
"""
from math import isfinite

WEST = 24.725742313931445
SOUTH = 42.12501359329014
EAST = 24.774257686068555
NORTH = 42.16098640670986
AREA_NAME = "Демо зона — Пловдив"


class OutsideServiceAreaError(Exception):
    """Координатите не могат да се използват в текущата демо зона."""


def is_in_service_area(latitude: float, longitude: float) -> bool:
    return (
        isfinite(latitude) and isfinite(longitude)
        and SOUTH <= latitude <= NORTH
        and WEST <= longitude <= EAST
    )


def require_service_area(latitude: float, longitude: float, label="Местоположението") -> None:
    if not is_in_service_area(latitude, longitude):
        raise OutsideServiceAreaError(
            f"{label} е извън обслужвания район. "
            "Избери координати в обозначената демо зона в Пловдив."
        )


def service_area_geojson() -> dict:
    # GeoJSON използва [дължина, ширина]. Границата също е допустима.
    return {
        "type": "Feature",
        "properties": {"name": AREA_NAME},
        "geometry": {
            "type": "Polygon",
            "coordinates": [[
                [WEST, SOUTH], [EAST, SOUTH], [EAST, NORTH],
                [WEST, NORTH], [WEST, SOUTH],
            ]],
        },
    }
