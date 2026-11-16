import { useEffect, useRef, useState } from "react";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { DeliveryRoute, Point } from "./dispatch";

export default function DispatchMap({ route }: { route: DeliveryRoute }) {
  const host = useRef<HTMLDivElement>(null);
  const [tileError, setTileError] = useState(false);
  useEffect(() => {
    if (!host.current) return;
    const map = L.map(host.current, {
      scrollWheelZoom: false,
      zoomControl: false,
    });
    L.control.zoom({ position: "topright" }).addTo(map);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    })
      .on("tileerror", () => setTileError(true))
      .addTo(map);
    const g = route.geometry;
    const coords: Point[] =
      g.type === "Point" ? [g.coordinates] : g.coordinates;
    const points = coords.map(([x, y]) => L.latLng(y, x));
    if (points.length) {
      L.polyline(points, { color: "#fff", weight: 9, opacity: 0.9 }).addTo(map);
      L.polyline(points, { color: "#265be8", weight: 5 }).addTo(map);
      const marker = (p: L.LatLng, letter: string, title: string) =>
        L.marker(p, {
          title,
          icon: L.divIcon({
            className: "map-pin",
            html: letter,
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          }),
        })
          .bindTooltip(title)
          .addTo(map);
      if (points.length === 1) {
        marker(points[0], "•", "Обща точка");
        map.setView(points[0], 16);
      } else {
        marker(points[0], "А", "Ресторант");
        marker(points[points.length - 1], "Б", "Клиент");
        map.fitBounds(L.latLngBounds(points), {
          padding: [26, 26],
          maxZoom: 16,
        });
      }
    }
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(host.current);
    return () => {
      observer.disconnect();
      map.remove();
    };
  }, [route]);
  return (
    <>
      <div
        ref={host}
        className="map-host"
        aria-label={"Маршрут за поръчка №" + route.order_id}
      />
      {tileError && (
        <small className="tile-note">
          Уличният фон не се зареди изцяло. Линията показва изчисления маршрут.
        </small>
      )}
    </>
  );
}
