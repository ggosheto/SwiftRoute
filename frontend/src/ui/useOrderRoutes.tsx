import { useCallback, useEffect, useRef, useState } from "react";
import { api, message } from "./dispatch";
import type { DeliveryRoute, Order, PickupRoute } from "./dispatch";

export default function useOrderRoutes() {
  const [route, setRoute] = useState<DeliveryRoute | null>(null);
  const [pickupRoute, setPickupRoute] = useState<PickupRoute | null>(null);
  const [routeId, setRouteId] = useState("");
  const [routeErr, setRouteErr] = useState("");
  const [routeNote, setRouteNote] = useState("");
  const [finding, setFinding] = useState(false);
  const version = useRef(0);
  // Separate the selected order from the editable number field.
  const selected = useRef<number | null>(null);

  const invalidateRoutes = useCallback(() => {
    version.current++;
    setRoute(null);
    setPickupRoute(null);
    setRouteErr("");
    setRouteNote("");
    setFinding(false);
  }, []);

  const showRoute = useCallback(async (id: number, knownOrder?: Order) => {
    if (!Number.isSafeInteger(id) || id < 1) return;
    const request = ++version.current;
    selected.current = id;
    setRouteId(String(id));
    setRoute(null);
    setPickupRoute(null);
    setRouteErr("");
    setRouteNote("");
    setFinding(true);
    try {
      const order = knownOrder ?? await api<Order>(`/orders/${id}`);
      if (request !== version.current) return;
      if (!order) throw new Error("Поръчката не е намерена.");

      const needsPickup =
        order.courier_id !== null && ["assigned", "accepted"].includes(order.status);
      const note = order.status === "pending"
        ? "Назначи куриер, за да видиш и маршрута до ресторанта."
        : order.status === "picked_up"
          ? "Поръчката е взета. Показан е планираният маршрут от ресторанта до клиента."
          : order.status === "delivered"
            ? "Завършена доставка. Показан е изчислен маршрут, а не запис на реалното движение."
            : "";

      const [delivery, pickup] = await Promise.allSettled([
        api<DeliveryRoute>(`/orders/${id}/route`),
        needsPickup
          ? api<PickupRoute>(`/orders/${id}/pickup-route`)
          : Promise.resolve(null),
      ]);
      if (request !== version.current) return;
      const errors: string[] = [];
      if (delivery.status === "fulfilled") setRoute(delivery.value);
      else errors.push("Ресторант → клиент: " + message(delivery.reason));
      if (pickup.status === "fulfilled") setPickupRoute(pickup.value);
      else errors.push("Куриер → ресторант: " + message(pickup.reason));
      setRouteNote(note);
      setRouteErr(errors.join(" "));
    } catch (e) {
      if (request === version.current) setRouteErr(message(e));
    } finally {
      if (request === version.current) setFinding(false);
    }
  }, []);

  const refreshSelected = useCallback((orders: Order[]) => {
    if (selected.current === null) return;
    const order = orders.find(o => o.id === selected.current);
    if (order) void showRoute(order.id, order);
    else {
      invalidateRoutes();
      setRouteErr("Избраната поръчка вече не е в списъка.");
    }
  }, [showRoute, invalidateRoutes]);

  useEffect(() => () => { version.current++; }, []);

  return {
    route, pickupRoute, routeId, setRouteId, routeErr, routeNote, finding,
    showRoute, invalidateRoutes, refreshSelected,
  };
}
