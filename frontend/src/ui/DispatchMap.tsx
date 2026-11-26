import { useEffect, useRef, useState } from "react";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { DeliveryRoute, PickupRoute, Point } from "./dispatch";
import type { Feature, Polygon } from "geojson";
import { api } from "./dispatch";

type Props = {
  route: DeliveryRoute | null;
  pickupRoute?: PickupRoute | null;
};

function routePoints(route: DeliveryRoute | null | undefined): L.LatLng[] {
  if (!route) return [];
  const geometry = route.geometry;
  const coords: Point[] =
    geometry.type === "Point" ? [geometry.coordinates] : geometry.coordinates;
  return coords.map(([longitude, latitude]) => L.latLng(latitude, longitude));
}

export default function DispatchMap({ route, pickupRoute = null }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layersRef = useRef<L.LayerGroup | null>(null);
  const [tileError, setTileError] = useState(false);
  const [area, setArea] = useState<Feature<Polygon> | null>(null);
  const [areaError, setAreaError] = useState(false);
  const [areaAttempt, setAreaAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    setAreaError(false);
    void api<Feature<Polygon>>("/service-area", { signal: controller.signal })
      .then((data) => {
        if (data.type !== "Feature" || data.geometry?.type !== "Polygon"
          || !data.geometry.coordinates[0]?.length) throw new Error("Невалидна зона");
        if (active) setArea(data);
      })
      .catch(() => { if (active) setAreaError(true); })
      .finally(() => clearTimeout(timeout));
    return () => { active = false; clearTimeout(timeout); controller.abort(); };
  }, [areaAttempt]);

  useEffect(() => {
    if (!host.current) return;
    const map = L.map(host.current, {
      scrollWheelZoom: false,
      zoomControl: false,
    }).setView([42.145, 24.75], 13);
    mapRef.current = map;
    // Зоната е под линиите на маршрутите и маркерите.
    map.createPane("serviceArea").style.zIndex = "350";
    layersRef.current = L.layerGroup().addTo(map);
    L.control.zoom({ position: "topright" }).addTo(map);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    })
      .on("tileerror", () => setTileError(true))
      .addTo(map);
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(host.current);
    return () => {
      observer.disconnect();
      map.remove();
      mapRef.current = null;
      layersRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !area) return;
    const boundary = L.geoJSON(area, {
      pane: "serviceArea",
      interactive: false,
      style: { color: "#03203D", weight: 2, dashArray: "8 6", fillColor: "#639CC5", fillOpacity: 0.18 },
    }).addTo(map);
    return () => { boundary.remove(); };
  }, [area]);

  useEffect(() => {
    const map = mapRef.current;
    const layers = layersRef.current;
    if (!map || !layers) return;
    layers.clearLayers();
    const pickup = routePoints(pickupRoute);
    const delivery = routePoints(route);
    const allPoints = [...pickup, ...delivery];
    if (!allPoints.length) {
      if (area) map.fitBounds(L.geoJSON(area).getBounds(), { padding: [20, 20], maxZoom: 14 });
      return;
    }

    const line = (points: L.LatLng[], color: string, dashed = false) => {
      if (points.length < 2) return;
      L.polyline(points, { color: "#ffffff", weight: 9, opacity: 0.95 }).addTo(layers);
      L.polyline(points, {
        color,
        weight: 5,
        opacity: 1,
        dashArray: dashed ? "10 8" : undefined,
      }).addTo(layers);
    };
    line(delivery, "#EB2F33");
    line(pickup, "#03203D", true);

    // Merge labels when restaurant, courier or delivery share a network node.
    const markers = new Map<string, { point: L.LatLng; labels: Set<string>; letters: Set<string> }>();
    const addMarker = (point: L.LatLng, letter: string, label: string) => {
      const key = point.lat.toFixed(7) + "," + point.lng.toFixed(7);
      const entry = markers.get(key) ?? { point, labels: new Set<string>(), letters: new Set<string>() };
      entry.labels.add(label);
      entry.letters.add(letter);
      markers.set(key, entry);
    };
    if (pickup.length) {
      addMarker(pickup[0], "К", "Куриер — последна записана позиция");
      addMarker(pickup[pickup.length - 1], "Р", "Ресторант");
    }
    if (delivery.length) {
      addMarker(delivery[0], "Р", "Ресторант");
      addMarker(delivery[delivery.length - 1], "Д", "Адрес за доставка");
    }
    for (const entry of markers.values()) {
      const title = [...entry.labels].join(" / ");
      L.marker(entry.point, {
        title,
        alt: title,
        icon: L.divIcon({
          className: "map-pin",
          html: entry.letters.size === 1 ? [...entry.letters][0] : "•",
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        }),
      }).bindTooltip(title).addTo(layers);
    }
    map.fitBounds(L.latLngBounds(allPoints), { padding: [32, 32], maxZoom: 16 });
  }, [route, pickupRoute, area]);

  const orderId = route?.order_id ?? pickupRoute?.order_id;
  return (
    <>
      <div
        ref={host}
        className="map-host"
        aria-label={orderId ? "Маршрути за поръчка №" + orderId : "Карта на маршрутите"}
      />
      <div className="service-area-note">
        {area && <>
          <p><strong>Синя зона: обслужван район</strong><br />
            Демо покритие в Пловдив. Адресите извън границата не се приемат.
          </p>
          <button type="button" className="secondary" onClick={() => {
            mapRef.current?.fitBounds(L.geoJSON(area).getBounds(), { padding: [20, 20], maxZoom: 14 });
          }}>Покажи цялата зона</button>
        </>}
        {!area && !areaError && <p role="status">Зареждане на обслужвания район…</p>}
        {areaError && <>
          <p role="alert">Границата не се зареди. Сървърът продължава да проверява адресите.</p>
          <button type="button" className="secondary" onClick={() => setAreaAttempt((value) => value + 1)}>
            Опитай отново
          </button>
        </>}
      </div>
      {tileError && (
        <small className="tile-note">
          Уличният фон не се зареди изцяло. Линиите показват изчислените маршрути.
        </small>
      )}
    </>
  );
}
